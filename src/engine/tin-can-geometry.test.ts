import { describe, expect, it } from 'vitest';
import { defaultTinCanParams, labelBandYBounds, mantleYBounds } from '@/scene/asset-tin-can';
import {
  buildTinCanBodyGeometry,
  tinCanOuterRadiusAtY,
} from './tin-can-geometry';

describe('tin-can-geometry', () => {
  const params = defaultTinCanParams();

  it('keeps radius constant in smooth mantle zones', () => {
    const { mantleY0, mantleY1 } = mantleYBounds(params);
    const mantleH = mantleY1 - mantleY0;
    const smoothLow = mantleY0 + 0.05 * mantleH;
    const smoothHigh = mantleY1 - 0.05 * mantleH;
    const R = params.bodyRadiusM;

    expect(tinCanOuterRadiusAtY(smoothLow, params)).toBeCloseTo(R, 6);
    expect(tinCanOuterRadiusAtY(smoothHigh, params)).toBeCloseTo(R, 6);
  });

  it('waves in the middle bead zone', () => {
    const { mantleY0, mantleY1 } = mantleYBounds(params);
    const mantleH = mantleY1 - mantleY0;
    const beadY0 = mantleY0 + 0.1 * mantleH;
    const beadY1 = mantleY0 + 0.9 * mantleH;
    const yA = beadY0 + 0.12 * (beadY1 - beadY0);
    const yB = beadY0 + 0.38 * (beadY1 - beadY0);
    const rA = tinCanOuterRadiusAtY(yA, params);
    const rB = tinCanOuterRadiusAtY(yB, params);

    expect(Math.abs(rA - rB)).toBeGreaterThan(1e-6);
  });

  it('mantle beads indent inward only (never past nominal radius)', () => {
    const { mantleY0, mantleY1 } = mantleYBounds(params);
    const beadY0 = mantleY0 + 0.1 * (mantleY1 - mantleY0);
    const beadY1 = mantleY0 + 0.9 * (mantleY1 - mantleY0);
    const R = params.bodyRadiusM;
    const samples = 40;
    let minR = R;
    for (let i = 0; i <= samples; i += 1) {
      const y = beadY0 + (i / samples) * (beadY1 - beadY0);
      const r = tinCanOuterRadiusAtY(y, params);
      minR = Math.min(minR, r);
      expect(r).toBeLessThanOrEqual(R + 1e-9);
      expect(r).toBeGreaterThanOrEqual(R * (1 - 0.03));
    }
    expect(minR).toBeLessThan(R - 1e-6);
  });

  it('end rings extend past body radius', () => {
    const geometry = buildTinCanBodyGeometry(params);
    const position = geometry.getAttribute('position');
    const positions = position.array as Float32Array;
    let maxR = 0;
    for (let i = 0; i < positions.length; i += 3) {
      const r = Math.hypot(positions[i], positions[i + 2]);
      if (r > maxR) {maxR = r;}
    }
    expect(maxR).toBeGreaterThan(params.bodyRadiusM + params.endRingThicknessM * 0.9);
    geometry.dispose();
  });

  it('prints only on the side mantle band, not on lids or end rings', () => {
    const geometry = buildTinCanBodyGeometry(params);
    const printUv = geometry.getAttribute('printUv');
    const position = geometry.getAttribute('position');
    const { labelY0, labelY1 } = labelBandYBounds(params);
    const R = params.bodyRadiusM;
    let printed = 0;
    for (let i = 0; i < position.count; i += 1) {
      const u = printUv.getX(i);
      const v = printUv.getY(i);
      if (u < 0 || u > 1 || v < 0 || v > 1) {continue;}
      printed += 1;
      const r = Math.hypot(position.getX(i), position.getZ(i));
      expect(r).toBeLessThanOrEqual(R + 1e-6);
      expect(r).toBeGreaterThan(R * 0.95);
    }
    expect(printed).toBeGreaterThan(0);
    expect(labelY1).toBeGreaterThan(labelY0);
    geometry.dispose();
  });
});
