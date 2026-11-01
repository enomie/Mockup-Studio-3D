import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MeshBasicMaterial } from 'three/webgpu';
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultWineBottleParams } from '@/scene/asset-wine-bottle';
import { buildWineBottleMeshes } from './wine-bottle-geometry';
import {
  clearRawWineBottleSvgPointsCache,
  extractOpenPathPointsFromSvgText,
  extractWineBottlePartsFromSvgText,
  setRawWineBottlePartsCache,
  setRawWineBottleSvgPointsCache,
} from './wine-bottle-svg-profile';

const PUBLIC_LATHE = join(process.cwd(), 'public', 'profiles', 'lathe');
const stubMaterial = new MeshBasicMaterial();

function syntheticOpenWallRaw() {
  const yFoot = 820;
  return [
    { x: 1, y: yFoot },
    { x: 50, y: yFoot },
    { x: 50, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: yFoot },
    { x: 1, y: yFoot + 7 },
    { x: 1, y: yFoot },
  ];
}

function shippedSvg(profile: 'bordeaux' | 'alsace' | 'sparkling'): string {
  return readFileSync(join(PUBLIC_LATHE, `lathe-y-bottle-${profile}-open.svg`), 'utf8');
}

function shippedParts(profile: 'bordeaux' | 'alsace' | 'sparkling') {
  return extractWineBottlePartsFromSvgText(shippedSvg(profile));
}

function cacheSyntheticBottleSvg(): void {
  const raw = syntheticOpenWallRaw();
  for (const profile of ['bordeaux', 'alsace', 'sparkling'] as const) {
    setRawWineBottleSvgPointsCache(profile, raw);
    setRawWineBottlePartsCache(profile, shippedParts(profile));
  }
}

describe('wine-bottle-geometry', () => {
  beforeEach(() => {
    clearRawWineBottleSvgPointsCache();
    cacheSyntheticBottleSvg();
  });

  it('glass lathe foot sits at y=0 after pivot', async () => {
    const result = await buildWineBottleMeshes({
      params: defaultWineBottleParams('bordeaux'),
      sizeScale: 1,
      glassMaterial: stubMaterial,
      corkMaterial: stubMaterial,
      foilMaterial: stubMaterial,
      discMaterial: stubMaterial,
    });
    result.bodyMesh.geometry.computeBoundingBox();
    const footY = result.bodyMesh.geometry.boundingBox?.min.y ?? 0;
    expect(footY).toBeGreaterThanOrEqual(-1e-5);
    expect(footY).toBeLessThan(1e-5);
    result.bodyMesh.geometry.dispose();
  });

  it('glass lathe positions have no NaN (closed wall ring)', async () => {
    const result = await buildWineBottleMeshes({
      params: defaultWineBottleParams('alsace'),
      sizeScale: 1,
      glassMaterial: stubMaterial,
      corkMaterial: stubMaterial,
      foilMaterial: stubMaterial,
      discMaterial: stubMaterial,
    });
    const pos = result.bodyMesh.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i += 1) {
      expect(Number.isFinite(pos.getX(i))).toBe(true);
      expect(Number.isFinite(pos.getY(i))).toBe(true);
      expect(Number.isFinite(pos.getZ(i))).toBe(true);
    }
    result.bodyMesh.geometry.dispose();
  });

  it('builds glass from real bordeaux-open SVG', async () => {
    const svgText = readFileSync(join(PUBLIC_LATHE, 'lathe-y-bottle-bordeaux-open.svg'), 'utf8');
    const raw = extractOpenPathPointsFromSvgText(svgText, 48);
    setRawWineBottleSvgPointsCache('bordeaux', raw);
    const result = await buildWineBottleMeshes({
      params: defaultWineBottleParams('bordeaux'),
      sizeScale: 1,
      glassMaterial: stubMaterial,
      corkMaterial: stubMaterial,
      foilMaterial: stubMaterial,
      discMaterial: stubMaterial,
    });
    expect(result.bodyMesh.geometry.getAttribute('position').count).toBeGreaterThan(100);
    result.bodyMesh.geometry.dispose();
  });

  it('builds no label mesh without image', async () => {
    const result = await buildWineBottleMeshes({
      params: defaultWineBottleParams('bordeaux'),
      sizeScale: 1,
      glassMaterial: stubMaterial,
      corkMaterial: stubMaterial,
      foilMaterial: stubMaterial,
      discMaterial: stubMaterial,
    });
    expect(result.bodyMesh.geometry.getAttribute('printUv')).toBeTruthy();
    expect(result.bodyMesh).toBeTruthy();
  });

  it('capsule parts from the SVG: foil on the glass, disc on top, cork in the neck', async () => {
    for (const profile of ['bordeaux', 'alsace', 'sparkling'] as const) {
      setRawWineBottleSvgPointsCache(profile, extractOpenPathPointsFromSvgText(shippedSvg(profile), 48));
      const params = defaultWineBottleParams(profile);
      const result = await buildWineBottleMeshes({
        params,
        sizeScale: 1,
        glassMaterial: stubMaterial,
        corkMaterial: stubMaterial,
        foilMaterial: stubMaterial,
        discMaterial: stubMaterial,
      });
      const { foilMesh, discMesh, corkMesh, bodyMesh } = result;
      expect(foilMesh && discMesh && corkMesh).toBeTruthy();
      const box = (m: typeof bodyMesh) => {
        m.geometry.computeBoundingBox();
        return m.geometry.boundingBox!;
      };
      const glassTop = box(bodyMesh).max.y;
      expect(glassTop).toBeCloseTo(params.heightM, 4);
      // Disc is the top-most part, above the foil; foil covers the glass mouth.
      expect(box(discMesh!).max.y).toBeGreaterThan(box(foilMesh!).max.y);
      expect(box(foilMesh!).max.y).toBeGreaterThan(glassTop);
      expect(box(corkMesh!).max.y).toBeLessThanOrEqual(glassTop + 1e-6);
      // Foil side stays outside the glass outer radius (gap drawn in the SVG).
      const glassWall = bodyMesh.geometry.getAttribute('position');
      const pos = foilMesh!.geometry.getAttribute('position');
      const glassProfile: { x: number; y: number }[] = [];
      for (let i = 0; i < glassWall.count; i += 1) {
        glassProfile.push({ x: Math.hypot(glassWall.getX(i), glassWall.getZ(i)), y: glassWall.getY(i) });
      }
      for (let i = 0; i < pos.count; i += 1) {
        const y = pos.getY(i);
        const r = Math.hypot(pos.getX(i), pos.getZ(i));
        if (y > glassTop - 0.002 || r < 0.005) {
          continue;
        }
        const glassR = Math.max(
          ...glassProfile.filter((p) => Math.abs(p.y - y) < 0.0005).map((p) => p.x),
          0,
        );
        expect(r).toBeGreaterThan(glassR);
      }
    }
  });
});
