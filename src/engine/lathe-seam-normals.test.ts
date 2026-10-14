import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LatheGeometry, Vector2, type BufferAttribute } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import {
  weldLathePhiSeam,
  weldLathePhiSeamIndices,
  weldLathePhiSeamNormals,
} from './lathe-seam-normals';
import { prepareWineBottleGlassLatheProfile } from './wine-bottle-glass';
import {
  extractOpenPathPointsFromSvgText,
  normalizeOpenWallSvgToLathePoints,
} from './wine-bottle-svg-profile';

function maxSeamNormalAngleDeg(
  norm: BufferAttribute,
  segments: number,
  rows: number,
): number {
  let maxAng = 0;
  for (let j = 0; j < rows; j += 1) {
    const dot =
      norm.getX(j) * norm.getX(segments * rows + j) +
      norm.getY(j) * norm.getY(segments * rows + j) +
      norm.getZ(j) * norm.getZ(segments * rows + j);
    maxAng = Math.max(
      maxAng,
      Math.acos(Math.min(1, Math.max(-1, dot))) * (180 / Math.PI),
    );
  }
  return maxAng;
}

describe('LatheGeometry vertex layout probe', () => {
  it('column 0 and segments share position per profile row', () => {
    const profile = [
      new Vector2(0.02, 0),
      new Vector2(0.04, 0.1),
      new Vector2(0.03, 0.2),
    ];
    const segments = 8;
    const phiStart = Math.PI;
    const g = new LatheGeometry(profile, segments, phiStart);
    const pos = g.getAttribute('position') as BufferAttribute;
    const cols = segments + 1;
    const rows = profile.length;
    expect(pos.count).toBe(cols * rows);

    let layout: 'ij' | 'ji' | null = null;
    for (const order of ['ij', 'ji'] as const) {
      let ok = true;
      for (let j = 0; j < rows; j += 1) {
        const i0 = order === 'ij' ? 0 * rows + j : j * cols + 0;
        const i1 = order === 'ij' ? segments * rows + j : j * cols + segments;
        const dist = Math.hypot(
          pos.getX(i0) - pos.getX(i1),
          pos.getY(i0) - pos.getY(i1),
          pos.getZ(i0) - pos.getZ(i1),
        );
        if (dist > 1e-5) {
          ok = false;
          break;
        }
      }
      if (ok) {
        layout = order;
        break;
      }
    }
    expect(layout).toBe('ij');
  });
});

describe('weldLathePhiSeamNormals', () => {
  it('welds built-in LatheGeometry normals without computeVertexNormals', () => {
    const segments = 8;
    const profile = [new Vector2(0.04, 0), new Vector2(0.04, 0.2)];
    const g = new LatheGeometry(profile, segments, Math.PI);
    const norm = g.getAttribute('normal') as BufferAttribute;
    const rows = profile.length;
    norm.setXYZ(segments * rows, 0, 1, 0);
    weldLathePhiSeamNormals(g, segments, rows);
    expect(norm.getX(0)).toBeCloseTo(norm.getX(segments * rows), 5);
    expect(norm.getY(0)).toBeCloseTo(norm.getY(segments * rows), 5);
  });

  it('welds after computeVertexNormals when seam columns disagree', () => {
    const segments = 16;
    const profile = [new Vector2(0.04, 0), new Vector2(0.04, 0.2), new Vector2(0.03, 0.25)];
    const g = new LatheGeometry(profile, segments, Math.PI);
    g.computeVertexNormals();
    const pos = g.getAttribute('position') as BufferAttribute;
    const norm = g.getAttribute('normal') as BufferAttribute;
    const rows = profile.length;
    expect(pos.count).toBe((segments + 1) * rows);
    expect(norm.count).toBe(pos.count);
    let maxAngBefore = 0;
    for (let j = 0; j < rows; j += 1) {
      const dot =
        norm.getX(j) * norm.getX(segments * rows + j) +
        norm.getY(j) * norm.getY(segments * rows + j) +
        norm.getZ(j) * norm.getZ(segments * rows + j);
      maxAngBefore = Math.max(
        maxAngBefore,
        Math.acos(Math.min(1, Math.max(-1, dot))) * (180 / Math.PI),
      );
    }
    expect(maxAngBefore).toBeGreaterThan(1);

    weldLathePhiSeamNormals(g, segments, rows);

    let maxAngAfter = 0;
    for (let j = 0; j < rows; j += 1) {
      const dot =
        norm.getX(j) * norm.getX(segments * rows + j) +
        norm.getY(j) * norm.getY(segments * rows + j) +
        norm.getZ(j) * norm.getZ(segments * rows + j);
      maxAngAfter = Math.max(
        maxAngAfter,
        Math.acos(Math.min(1, Math.max(-1, dot))) * (180 / Math.PI),
      );
    }
    expect(maxAngAfter).toBeLessThan(0.05);
  });

  it('reduces seam normal mismatch on closed wall ring after computeVertexNormals', () => {
    const wall = [
      new Vector2(0.001, 0),
      new Vector2(0.04, 0),
      new Vector2(0.04, 0.29),
      new Vector2(0.035, 0.29),
      new Vector2(0.035, 0),
    ];
    const segments = 32;
    const g = new LatheGeometry(wall, segments, Math.PI);
    g.computeVertexNormals();
    const norm = g.getAttribute('normal') as BufferAttribute;
    const rows = wall.length;

    const maxSeamAngle = (): number => {
      let maxAng = 0;
      for (let j = 0; j < rows; j += 1) {
        const dot =
          norm.getX(j) * norm.getX(segments * rows + j) +
          norm.getY(j) * norm.getY(segments * rows + j) +
          norm.getZ(j) * norm.getZ(segments * rows + j);
        maxAng = Math.max(
          maxAng,
          Math.acos(Math.min(1, Math.max(-1, dot))) * (180 / Math.PI),
        );
      }
      return maxAng;
    };

    const before = maxSeamAngle();
    expect(before).toBeGreaterThan(0.1);
    weldLathePhiSeamNormals(g, segments, wall.length);
    expect(maxSeamAngle()).toBeLessThan(0.05);
  });

  it('index weld stops using duplicate phi column on alsace glass', () => {
    const svg = readFileSync(
      join(process.cwd(), 'public', 'profiles', 'lathe', 'bottle-alsace-open.svg'),
      'utf8',
    );
    const wall = prepareWineBottleGlassLatheProfile(
      normalizeOpenWallSvgToLathePoints(extractOpenPathPointsFromSvgText(svg, 48), 0.29),
    );
    const segments = 80;
    const rows = wall.length;
    const g = new LatheGeometry(wall, segments, Math.PI);
    weldLathePhiSeamIndices(g, segments, rows);
    const index = g.getIndex()!;
    let usesLastCol = 0;
    for (let i = 0; i < index.count; i += 1) {
      if (index.getX(i) >= segments * rows) {
        usesLastCol += 1;
      }
    }
    expect(usesLastCol).toBe(0);
    g.dispose();
  });

  it('welds alsace closed wall lathe seam after computeVertexNormals', () => {
    const svg = readFileSync(
      join(process.cwd(), 'public', 'profiles', 'lathe', 'bottle-alsace-open.svg'),
      'utf8',
    );
    const wall = prepareWineBottleGlassLatheProfile(
      normalizeOpenWallSvgToLathePoints(extractOpenPathPointsFromSvgText(svg, 48), 0.29),
    );
    const segments = 80;
    const g = new LatheGeometry(wall, segments, Math.PI);
    const rows = wall.length;
    weldLathePhiSeam(g, segments, rows);
    const norm = g.getAttribute('normal') as BufferAttribute;
    expect(maxSeamNormalAngleDeg(norm, segments, rows)).toBeLessThan(0.05);
    g.dispose();
  });
});
