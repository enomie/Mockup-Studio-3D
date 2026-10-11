import { describe, expect, it } from 'vitest';
import { defaultTinCanParams, mantleYBounds } from '@/scene/asset-tin-can';
import {
  buildTinCanBodyGeometry,
  buildTinCanLabelMantleGeometry,
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
    const geometry = buildTinCanBodyGeometry(params, false);
    const position = geometry.getAttribute('position');
    const positions = position.array as Float32Array;
    let maxR = 0;
    for (let i = 0; i < positions.length; i += 3) {
      const r = Math.hypot(positions[i], positions[i + 2]);
      if (r > maxR) maxR = r;
    }
    expect(maxR).toBeGreaterThan(params.bodyRadiusM + params.endRingThicknessM * 0.9);
    geometry.dispose();
  });

  it('omitting label band removes hull triangles when label is shown', () => {
    const full = buildTinCanBodyGeometry(params, false);
    const cut = buildTinCanBodyGeometry(params, true);
    expect(cut.getIndex()!.count).toBeLessThan(full.getIndex()!.count);
    full.dispose();
    cut.dispose();
  });

  it('label mantle matches inward bead radii', () => {
    const geometry = buildTinCanLabelMantleGeometry(params);
    const position = geometry.getAttribute('position');
    const positions = position.array as Float32Array;
    const R = params.bodyRadiusM;
    const standoff = 0.00008;
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      const r = Math.hypot(positions[i], positions[i + 2]);
      const expected = tinCanOuterRadiusAtY(y, params) + standoff;
      expect(r).toBeCloseTo(expected, 3);
      expect(r).toBeLessThanOrEqual(R + standoff + 1e-6);
    }
    geometry.dispose();
  });
});
