import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FrontSide,
  LatheGeometry,
  MeshBasicMaterial,
  Vector2,
  Vector3,
  type BufferAttribute,
  type MeshDepthMaterial,
} from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import {
  buildWineBottleGlassMesh,
  buildWineBottleGlassMeshFromLatheProfile,
  buildWineBottleGlassMeshFromWall,
  offsetLatheProfileForInnerMantle,
  prepareWineBottleGlassLatheProfile,
  trimLatheProfileToAscendingOuterMantle,
  WINE_BOTTLE_GLASS_LATHE_SEGMENTS,
} from './wine-bottle-glass';
import { closeOuterWallProfileToLatheRing } from './wine-bottle-closed-wall-profile';
import {
  extractOpenPathPointsFromSvgText,
  normalizeOpenWallSvgToLathePoints,
  sampleWineBottleRadiusAtY,
  setRawWineBottleSvgPointsCache,
  wineBottleLatheProfileBounds,
} from './wine-bottle-svg-profile';

const PUBLIC = join(process.cwd(), 'public');
const HEIGHT_M = 0.29;
const WALL_THICKNESS_M = 0.0025;
const stubMaterial = new MeshBasicMaterial();
const glassBuild = { wallThicknessM: WALL_THICKNESS_M };

const BOTTLE_SVGS = [
  'bottle-bordeaux-open.svg',
  'bottle-alsace-open.svg',
  'bottle-sparkling-open.svg',
] as const;

function wallFromSvg(file: string): Vector2[] {
  const svg = readFileSync(join(PUBLIC, file), 'utf8');
  return normalizeOpenWallSvgToLathePoints(
    extractOpenPathPointsFromSvgText(svg, 48),
    HEIGHT_M,
  );
}

function latheProfileFromSvg(file: string): Vector2[] {
  return trimLatheProfileToAscendingOuterMantle(
    prepareWineBottleGlassLatheProfile(wallFromSvg(file)),
  );
}

function findProfileSelfIntersections(points: Vector2[]): [number, number][] {
  const hits: [number, number][] = [];
  const ccw = (a: Vector2, b: Vector2, c: Vector2) =>
    (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  const cross = (p1: Vector2, p2: Vector2, p3: Vector2, p4: Vector2) =>
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);

  for (let i = 0; i < points.length - 1; i += 1) {
    for (let j = i + 2; j < points.length - 1; j += 1) {
      if (cross(points[i], points[i + 1], points[j], points[j + 1])) {
        hits.push([i, j]);
      }
    }
  }
  return hits;
}

function indexTriangleCount(geometry: { getIndex(): { count: number } | null }): number {
  const index = geometry.getIndex();
  return index ? index.count : 0;
}

function countDegenerateLatheTriangles(profile: Vector2[]): number {
  const geometry = new LatheGeometry(profile, WINE_BOTTLE_GLASS_LATHE_SEGMENTS);
  geometry.computeVertexNormals();
  const position = geometry.getAttribute('position') as BufferAttribute;
  const index = geometry.getIndex();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const ab = new Vector3();
  const ac = new Vector3();
  const cross = new Vector3();
  let degenerate = 0;
  const triangleCount = index ? index.count / 3 : position.count / 3;
  for (let t = 0; t < triangleCount; t += 1) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(position, i0);
    b.fromBufferAttribute(position, i1);
    c.fromBufferAttribute(position, i2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    cross.crossVectors(ab, ac);
    if (cross.length() * 0.5 < 1e-12) {
      degenerate += 1;
    }
  }
  geometry.dispose();
  return degenerate;
}

describe('wine-bottle-glass', () => {
  for (const file of BOTTLE_SVGS) {
    it(`${file}: inner profile radius offset by wall thickness`, () => {
      const outer = latheProfileFromSvg(file);
      const inner = offsetLatheProfileForInnerMantle(outer, WALL_THICKNESS_M);
      expect(inner.length).toBeGreaterThan(50);
      expect(inner.length).toBeLessThanOrEqual(outer.length);
      const innerBounds = wineBottleLatheProfileBounds(inner);
      const sampleYs = [0.35, 0.55, 0.75, 0.92].map(
        (t) => innerBounds.minY + (innerBounds.maxY - innerBounds.minY) * t,
      );
      for (const y of sampleYs) {
        const rOuter = sampleWineBottleRadiusAtY(outer, y);
        const rInner = sampleWineBottleRadiusAtY(inner, y);
        expect(rInner).toBeLessThanOrEqual(rOuter - WALL_THICKNESS_M + 1e-9);
      }
    });

    it(`${file}: inner lathe profile has no degenerate triangles`, () => {
      const inner = offsetLatheProfileForInnerMantle(
        latheProfileFromSvg(file),
        WALL_THICKNESS_M,
      );
      expect(countDegenerateLatheTriangles(inner)).toBe(0);
    });

    it(`${file}: lathe profile has no self-intersections`, () => {
      expect(findProfileSelfIntersections(latheProfileFromSvg(file))).toEqual([]);
    });

    it(`${file}: lathe mesh has no degenerate triangles`, () => {
      expect(countDegenerateLatheTriangles(latheProfileFromSvg(file))).toBe(0);
    });
  }

  it('prepareWineBottleGlassLatheProfile drops SVG Z duplicate', () => {
    const prep = latheProfileFromSvg('bottle-alsace-open.svg');
    expect(prep.length).toBeGreaterThan(50);
    expect(prep.every((p) => p.x >= 0)).toBe(true);
    expect(prep[0].distanceTo(prep.at(-1)!)).toBeGreaterThan(1e-8);
  });

  it('adds stirn ring geometry for closed wall profile', () => {
    const heightM = 0.29;
    const ring = closeOuterWallProfileToLatheRing(
      [new Vector2(0.038, 0), new Vector2(0.038, heightM)],
      WALL_THICKNESS_M,
    );
    const profile = prepareWineBottleGlassLatheProfile(ring);
    const mantleOnly = new LatheGeometry(profile, WINE_BOTTLE_GLASS_LATHE_SEGMENTS);
    const withStirn = buildWineBottleGlassMeshFromLatheProfile(
      profile,
      stubMaterial,
      true,
      glassBuild,
    );
    const mantleTris = mantleOnly.getIndex()?.count ?? mantleOnly.getAttribute('position').count;
    const bodyTris = withStirn.geometry.getIndex()?.count ?? 0;
    expect(bodyTris).toBeGreaterThan(mantleTris);
    mantleOnly.dispose();
    withStirn.geometry.dispose();
  });

  it('open outer SVG adds stirn caps via wall thickness', () => {
    const profile = latheProfileFromSvg('bottle-bordeaux-open.svg');
    const mantleOnly = new LatheGeometry(profile, WINE_BOTTLE_GLASS_LATHE_SEGMENTS);
    const withStirn = buildWineBottleGlassMeshFromLatheProfile(
      profile,
      stubMaterial,
      true,
      glassBuild,
    );
    const mantleTris = mantleOnly.getIndex()?.count ?? mantleOnly.getAttribute('position').count;
    const bodyTris = withStirn.geometry.getIndex()?.count ?? 0;
    expect(bodyTris).toBeGreaterThan(mantleTris);
    mantleOnly.dispose();
    withStirn.geometry.dispose();
  });

  for (const file of BOTTLE_SVGS) {
    it(`${file}: inner mantle off matches baseline triangle count`, () => {
      const profile = latheProfileFromSvg(file);
      const baseline = buildWineBottleGlassMeshFromLatheProfile(
        profile,
        stubMaterial,
        true,
        { wallThicknessM: WALL_THICKNESS_M, innerMantle: false },
      );
      const explicitOff = buildWineBottleGlassMeshFromLatheProfile(
        profile,
        stubMaterial,
        true,
        glassBuild,
      );
      expect(indexTriangleCount(explicitOff.geometry)).toBe(indexTriangleCount(baseline.geometry));
      baseline.geometry.dispose();
      explicitOff.geometry.dispose();
    });

    it(`${file}: inner mantle on increases body triangle count`, () => {
      const profile = latheProfileFromSvg(file);
      const withoutInner = buildWineBottleGlassMeshFromLatheProfile(
        profile,
        stubMaterial,
        true,
        { wallThicknessM: WALL_THICKNESS_M, innerMantle: false },
      );
      const withInner = buildWineBottleGlassMeshFromLatheProfile(
        profile,
        stubMaterial,
        true,
        { wallThicknessM: WALL_THICKNESS_M, innerMantle: true },
      );
      expect(indexTriangleCount(withInner.geometry)).toBeGreaterThan(
        indexTriangleCount(withoutInner.geometry),
      );
      withoutInner.geometry.dispose();
      withInner.geometry.dispose();
    });
  }

  it('inner mantle lathe normals face the cavity after x-flip', () => {
    const profile = latheProfileFromSvg('bottle-bordeaux-open.svg');
    const innerProfile = offsetLatheProfileForInnerMantle(profile, WALL_THICKNESS_M);
    const inner = new LatheGeometry(innerProfile, WINE_BOTTLE_GLASS_LATHE_SEGMENTS);
    inner.scale(-1, 1, 1);
    inner.computeVertexNormals();
    const bounds = wineBottleLatheProfileBounds(innerProfile);
    const ySample = bounds.minY + (bounds.maxY - bounds.minY) * 0.55;
    const rInner = sampleWineBottleRadiusAtY(innerProfile, ySample);
    const position = inner.getAttribute('position') as BufferAttribute;
    const normal = inner.getAttribute('normal') as BufferAttribute;
    const p = new Vector3();
    const n = new Vector3();
    let found = false;
    for (let i = 0; i < position.count; i += 1) {
      p.fromBufferAttribute(position, i);
      if (Math.abs(p.y - ySample) > 0.006) {
        continue;
      }
      const radial = Math.hypot(p.x, p.z);
      if (Math.abs(radial - rInner) > 0.002) {
        continue;
      }
      n.fromBufferAttribute(normal, i);
      const radialDir = new Vector3(p.x, 0, p.z).normalize();
      expect(n.dot(radialDir)).toBeLessThan(0);
      found = true;
      break;
    }
    expect(found).toBe(true);
    inner.dispose();
  });

  it('builds glass mesh from lathe profile (bottle build path)', () => {
    const mesh = buildWineBottleGlassMeshFromLatheProfile(
      latheProfileFromSvg('bottle-alsace-open.svg'),
      stubMaterial,
      true,
      glassBuild,
    );
    mesh.geometry.computeBoundingBox();
    expect(mesh.geometry.boundingBox?.min.y).toBeLessThan(1e-5);
    mesh.geometry.dispose();
  });

  it('builds glass mesh from normalized wall (fetch wrapper path)', () => {
    const mesh = buildWineBottleGlassMeshFromWall(
      wallFromSvg('bottle-alsace-open.svg'),
      stubMaterial,
      true,
      glassBuild,
    );
    mesh.geometry.computeBoundingBox();
    expect(mesh.geometry.boundingBox?.min.y).toBeLessThan(1e-5);
    mesh.geometry.dispose();
  });

  it('builds glass mesh via fetch loader', async () => {
    const svg = readFileSync(join(PUBLIC, 'bottle-alsace-open.svg'), 'utf8');
    setRawWineBottleSvgPointsCache('alsace', extractOpenPathPointsFromSvgText(svg, 48));
    const mesh = await buildWineBottleGlassMesh(
      'alsace',
      HEIGHT_M,
      stubMaterial,
      true,
      glassBuild,
    );
    mesh.geometry.computeBoundingBox();
    expect(mesh.geometry.boundingBox?.min.y).toBeLessThan(1e-5);
    expect((mesh.customDepthMaterial as MeshDepthMaterial).side).toBe(FrontSide);
    mesh.geometry.dispose();
  });
});
