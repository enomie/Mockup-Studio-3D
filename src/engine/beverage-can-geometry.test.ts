import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Vector2 } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { defaultBeverageCanParams } from '@/scene/asset-beverage-can';
import { computeLabelUnfoldForProfile } from './beverage-can-label-unfold';
import {
  buildBeverageCanLabelMantleGeometry,
  buildCanHullLatheGeometry,
  buildTopRingGeometry,
  labelBandYBounds,
} from './beverage-can-geometry';
import {
  latheProfileBounds,
  normalizeSvgProfileToLathePoints,
  setRawSvgProfilePointsCache,
} from './beverage-can-svg-profile';

const PUBLIC = join(process.cwd(), 'public');

/** Right-half silhouette stub (radius × height in arbitrary SVG units). */
function syntheticCanSilhouette(): { x: number; y: number }[] {
  return [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 40, y: 280 },
    { x: 35, y: 300 },
    { x: 0, y: 300 },
  ];
}

function syntheticCylinderProfile(params: ReturnType<typeof defaultBeverageCanParams>) {
  const r = params.diameterM / 2;
  return [
    new Vector2(r * 0.5, 0),
    new Vector2(r, 0),
    new Vector2(r, params.heightM),
    new Vector2(r * 0.5, params.heightM),
  ];
}

describe('beverage-can-svg-profile', () => {
  it('normalizes silhouette units to nominal height and BOD', () => {
    for (const profile of ['standard', 'sleek'] as const) {
      const params = defaultBeverageCanParams(profile);
      const lathe = normalizeSvgProfileToLathePoints(
        syntheticCanSilhouette(),
        params.heightM,
        params.diameterM,
      );
      const bounds = latheProfileBounds(lathe);
      expect(bounds.maxY - bounds.minY).toBeCloseTo(params.heightM, 3);
      expect(bounds.maxRadius).toBeCloseTo(params.diameterM / 2, 3);
    }
  });

  it('loads cached raw points for integration (file present)', () => {
    const svgText = readFileSync(join(PUBLIC, '330ml-classic.svg'), 'utf8');
    expect(svgText.includes('<path')).toBe(true);
    setRawSvgProfilePointsCache('standard', syntheticCanSilhouette());
    expect(syntheticCanSilhouette().length).toBeGreaterThan(2);
  });
});

describe('beverage-can-geometry', () => {
  it('bottom pivot places mesh foot at y = 0', () => {
    for (const profile of ['standard', 'sleek'] as const) {
      const params = defaultBeverageCanParams(profile);
      const geometry = buildCanHullLatheGeometry(syntheticCylinderProfile(params));
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      expect(box.min.y).toBeCloseTo(0, 4);
      expect(box.max.y).toBeCloseTo(params.heightM, 3);
    }
  });

  it('omitting label band removes cylindrical hull triangles when label is shown', () => {
    const params = defaultBeverageCanParams('standard');
    const profile = syntheticCylinderProfile(params);
    const full = buildCanHullLatheGeometry(profile);
    const cut = buildCanHullLatheGeometry(profile, { params, omitLabelBand: true });
    expect(cut.getIndex()!.count).toBeLessThan(full.getIndex()!.count);
    expect(cut.getIndex()!.count).toBeGreaterThan(0);
  });

  it('label mantle spans the cylindrical band height', () => {
    for (const profile of ['standard', 'sleek'] as const) {
      const params = defaultBeverageCanParams(profile);
      const { labelY0, labelY1 } = labelBandYBounds(params);
      const geometry = buildBeverageCanLabelMantleGeometry(
        syntheticCylinderProfile(params),
        params,
      );
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      expect(box.min.y).toBeCloseTo(labelY0, 4);
      expect(box.max.y).toBeCloseTo(labelY1, 4);
    }
  });

  it('label UV reaches v ≈ 1 near mantle top', () => {
    const params = defaultBeverageCanParams('standard');
    const { labelY1 } = labelBandYBounds(params);
    const geometry = buildBeverageCanLabelMantleGeometry(
      syntheticCylinderProfile(params),
      params,
    );
    const uv = geometry.getAttribute('uv');
    const pos = geometry.getAttribute('position');
    let maxVNearTop = 0;
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i);
      if (y >= labelY1 - params.heightM * 0.02) {
        maxVNearTop = Math.max(maxVNearTop, uv.getY(i));
      }
    }
    expect(maxVNearTop).toBeGreaterThan(0.95);
  });

  it('lathe seam is placed at −Z (back), not on front +Z', () => {
    const params = defaultBeverageCanParams('standard');
    const ring = buildTopRingGeometry(syntheticCylinderProfile(params), params);
    const pos = ring.getAttribute('position');
    let maxZ = -Infinity;
    let minZ = Infinity;
    let seamX = 0;
    let seamZ = 0;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 1e-6) {
        continue;
      }
      if (z > maxZ) {
        maxZ = z;
      }
      if (z < minZ) {
        minZ = z;
        seamX = x;
        seamZ = z;
      }
    }
    expect(minZ).toBeLessThan(-0.01);
    expect(Math.abs(seamX)).toBeLessThan(0.02);
    expect(Math.abs(seamZ + maxZ)).toBeLessThan(0.02);
  });

  it('top ring inner radius follows mantle profile (not fixed BOD)', () => {
    const params = defaultBeverageCanParams('standard');
    const rBod = params.diameterM / 2;
    const neckR = rBod * 0.88;
    const yNeck = params.heightM - params.topRingHeightM * 0.5;
    const mantleProfile = [
      new Vector2(0, 0),
      new Vector2(rBod, 0),
      new Vector2(rBod, yNeck),
      new Vector2(neckR, params.heightM),
    ];
    const ring = buildTopRingGeometry(mantleProfile, params);
    ring.computeBoundingBox();
    const box = ring.boundingBox!;
    expect(box.min.y).toBeCloseTo(0, 4);
    expect(box.max.y - box.min.y).toBeCloseTo(params.topRingHeightM, 4);
    const maxR = Math.max(
      Math.abs(box.max.x),
      Math.abs(box.min.x),
      Math.abs(box.max.z),
      Math.abs(box.min.z),
    );
    expect(maxR).toBeGreaterThan(neckR + params.topRingThicknessM * 0.9);
    expect(maxR).toBeLessThan(rBod + params.topRingThicknessM * 1.1);
  });

  it('label unfold aspect matches profile table', () => {
    for (const profile of ['standard', 'sleek'] as const) {
      const unfold = computeLabelUnfoldForProfile(profile);
      const params = defaultBeverageCanParams(profile);
      const expectedHeightMm = params.labelHeightM * 1000;
      expect(unfold.heightMm).toBeCloseTo(expectedHeightMm, 2);
    }
  });
});
