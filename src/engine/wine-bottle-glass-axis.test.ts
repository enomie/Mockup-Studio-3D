import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MeshBasicMaterial, Vector3 } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import {
  buildWineBottleGlassMeshFromLatheProfile,
  prepareWineBottleGlassLatheProfile,
  trimLatheProfileToAscendingOuterMantle,
} from './wine-bottle-glass';
import {
  extractOpenPathPointsFromSvgText,
  normalizeOpenWallSvgToLathePoints,
  wineBottleLatheProfileBounds,
} from './wine-bottle-svg-profile';

const PUBLIC_LATHE = join(process.cwd(), 'public', 'profiles', 'lathe');
const WALL = 0.0025;

function countAxisSpanningTriangles(geometry: {
  getAttribute: (name: string) => { count: number; getX: (i: number) => number; getY: (i: number) => number; getZ: (i: number) => number };
  getIndex: () => { count: number; getX: (i: number) => number } | null;
}): number {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const axisEps = 0.0003;
  const minSpanY = 0.05;
  let count = 0;
  const triCount = index ? index.count / 3 : position.count / 3;
  for (let t = 0; t < triCount; t += 1) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    a.set(position.getX(i0), position.getY(i0), position.getZ(i0));
    b.set(position.getX(i1), position.getY(i1), position.getZ(i1));
    c.set(position.getX(i2), position.getY(i2), position.getZ(i2));
    const onAxis = (p: Vector3) => Math.hypot(p.x, p.z) < axisEps;
    if (!onAxis(a) && !onAxis(b) && !onAxis(c)) {
      continue;
    }
    const yMin = Math.min(a.y, b.y, c.y);
    const yMax = Math.max(a.y, b.y, c.y);
    if (yMax - yMin > minSpanY) {
      count += 1;
    }
  }
  return count;
}

function inwardChordCount(profile: { x: number; y: number }[]): number {
  let count = 0;
  for (let i = 0; i < profile.length - 1; i += 1) {
    const a = profile[i];
    const b = profile[i + 1];
    const dy = Math.abs(a.y - b.y);
    if (dy < 0.02) {
      continue;
    }
    const rMid = a.x + 0.5 * (b.x - a.x);
    const rOuter = Math.max(a.x, b.x);
    if (rMid < rOuter * 0.65) {
      count += 1;
    }
  }
  return count;
}

describe('wine-bottle axis sheet probe', () => {
  it('merged glass mesh has no triangles spanning the rotation axis', () => {
    const svg = readFileSync(join(PUBLIC_LATHE, 'lathe-y-bottle-bordeaux-open.svg'), 'utf8');
    const profile = trimLatheProfileToAscendingOuterMantle(
      prepareWineBottleGlassLatheProfile(
        normalizeOpenWallSvgToLathePoints(extractOpenPathPointsFromSvgText(svg, 48), 0.29),
      ),
    );
    expect(inwardChordCount(profile)).toBeLessThanOrEqual(1);
    expect(profile.length).toBeGreaterThan(80);
    const bounds = wineBottleLatheProfileBounds(profile);
    expect(bounds.maxRadius).toBeCloseTo(0.038, 2);

    const mesh = buildWineBottleGlassMeshFromLatheProfile(profile, new MeshBasicMaterial(), true, {
      wallThicknessM: WALL,
    });
    expect(countAxisSpanningTriangles(mesh.geometry)).toBe(0);
    mesh.geometry.dispose();
  });
});
