import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Vector2 } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { defaultBeverageCanParams } from '@/scene/asset-beverage-can';
import { computeLabelUnfoldForProfile } from './beverage-can-label-unfold';
import {
  buildCanHullLatheGeometry,
  buildTopRingGeometry,
  labelBandYBounds,
} from './beverage-can-geometry';
import {
  extractBeverageCanPathsFromSvgText,
  latheProfileBounds,
  normalizeBeverageCanPaths,
} from './beverage-can-svg-profile';
import { beverageCanProfileMm } from '@/scene/beverage-can-profile-metrics';

const PUBLIC_LATHE = join(process.cwd(), 'public', 'profiles', 'lathe');

function loadShippedProfiles(profile: 'standard' | 'sleek') {
  const file =
    profile === 'standard' ? 'lathe-y-can-330ml-classic.svg' : 'lathe-y-can-330ml-sleek.svg';
  const raw = extractBeverageCanPathsFromSvgText(readFileSync(join(PUBLIC_LATHE, file), 'utf8'));
  return normalizeBeverageCanPaths(raw, beverageCanProfileMm(profile).footYMm);
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
  it('reads SVG mm 1:1 (no stretch): body = nominal height and BOD', () => {
    const expected = { standard: [115.2, 66], sleek: [146.05, 57.4] } as const;
    for (const profile of ['standard', 'sleek'] as const) {
      const { body } = loadShippedProfiles(profile);
      const bounds = latheProfileBounds(body);
      expect((bounds.maxY - bounds.minY) * 1000).toBeCloseTo(expected[profile][0], 1);
      expect(bounds.maxRadius * 2000).toBeCloseTo(expected[profile][1], 1);
      expect(bounds.minY).toBeCloseTo(0, 6);
    }
  });

  it('top ring shares the body transform and sits at the top, off the axis', () => {
    for (const profile of ['standard', 'sleek'] as const) {
      const { ring } = loadShippedProfiles(profile);
      const params = defaultBeverageCanParams(profile);
      const bounds = latheProfileBounds(ring);
      expect(bounds.maxY).toBeCloseTo(params.heightM, 6);
      expect(Math.min(...ring.map((p) => p.x))).toBeGreaterThan(0.02);
    }
  });

  it('size params come from the SVG', () => {
    const params = defaultBeverageCanParams('standard');
    expect(params.heightM * 1000).toBeCloseTo(beverageCanProfileMm('standard').heightMm, 6);
    expect(params.diameterM * 1000).toBeCloseTo(66, 3);
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

  it('keeps the full hull and writes printUv spanning the label band', () => {
    const params = defaultBeverageCanParams('standard');
    const profile = syntheticCylinderProfile(params);
    const plain = buildCanHullLatheGeometry(profile);
    const printed = buildCanHullLatheGeometry(profile, { params });
    expect(printed.getIndex()!.count).toBe(plain.getIndex()!.count);

    const { labelY0, labelY1 } = labelBandYBounds(params);
    const printUv = printed.getAttribute('printUv');
    const pos = printed.getAttribute('position');
    // V is linear in y, so band edges interpolate correctly even between profile vertices.
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i);
      const v = printUv.getY(i);
      if (v === -1) {continue;}
      expect(v).toBeCloseTo((y - labelY0) / (labelY1 - labelY0), 5);
    }
  });

  it('lathe seam is placed at −Z (back), not on front +Z', () => {
    const ring = buildTopRingGeometry(loadShippedProfiles('standard').ring);
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

  it('top ring revolves into a ring with a hole and outward normals', () => {
    const { ring } = loadShippedProfiles('standard');
    const geometry = buildTopRingGeometry(ring);
    const pos = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const radii: number[] = [];
    let outerChecked = 0;
    const maxR = Math.max(...ring.map((p) => p.x));
    for (let i = 0; i < pos.count; i += 1) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      radii.push(r);
      if (r > maxR - 1e-7) {
        const dot = (normal.getX(i) * pos.getX(i) + normal.getZ(i) * pos.getZ(i)) / r;
        expect(dot).toBeGreaterThan(0);
        outerChecked += 1;
      }
    }
    expect(outerChecked).toBeGreaterThan(0);
    expect(Math.min(...radii)).toBeGreaterThan(0.02);
  });

  it('label band ends at the top ring underside', () => {
    for (const profile of ['standard', 'sleek'] as const) {
      const params = defaultBeverageCanParams(profile);
      const { ring } = loadShippedProfiles(profile);
      const { labelY1 } = labelBandYBounds(params);
      expect(labelY1).toBeCloseTo(latheProfileBounds(ring).minY, 6);
    }
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
