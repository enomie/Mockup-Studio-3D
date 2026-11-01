import { describe, expect, it } from 'vitest';
import {
  bandUToTextureS,
  computeLabelPrintableBandMm,
  computeLabelPrintableBandHeightMm,
  imageMatchesPrintableBandAspect,
  labelImageUSpan,
} from './beverage-can-label-unfold';
import { beverageCanProfileMm } from '@/scene/beverage-can-profile-metrics';

describe('beverage-can label height-fit', () => {
  it('printable band runs from bottom metal up to the top ring underside (from SVG)', () => {
    for (const profile of ['standard', 'sleek'] as const) {
      const mm = beverageCanProfileMm(profile);
      expect(computeLabelPrintableBandHeightMm(profile)).toBeCloseTo(
        mm.labelTopFromFootMm - 5,
        6,
      );
    }
    // Ring underside sits just below the overall top (classic: ~114.9 mm above the foot).
    expect(beverageCanProfileMm('standard').labelTopFromFootMm).toBeCloseTo(114.888, 2);
  });

  it('standard printable band aspect = circumference / band height', () => {
    const band = computeLabelPrintableBandMm('standard');
    expect(band.widthMm / band.heightMm).toBeCloseTo((Math.PI * 66) / band.heightMm, 6);
  });

  it('detects matching image aspect for printable band', () => {
    const band = computeLabelPrintableBandMm('standard');
    const planeW = band.widthMm / 1000;
    const planeH = band.heightMm / 1000;
    const aspect = planeW / planeH;
    const w = 1925;
    const h = Math.round(w / aspect);
    expect(imageMatchesPrintableBandAspect(w, h, planeW, planeH)).toBe(true);
    expect(imageMatchesPrintableBandAspect(1000, 1000, planeW, planeH)).toBe(false);
  });

  it('maps band u to texture s for match, narrow, and wide', () => {
    const uSpanMatch = 1;
    expect(bandUToTextureS(0, uSpanMatch)).toBeCloseTo(0, 6);
    expect(bandUToTextureS(0.5, uSpanMatch)).toBeCloseTo(0.5, 6);
    expect(bandUToTextureS(1, uSpanMatch)).toBeCloseTo(1, 6);

    const uSpanNarrow = 0.5;
    expect(bandUToTextureS(0.5, uSpanNarrow)).toBeCloseTo(0.5, 6);
    expect(bandUToTextureS(0, uSpanNarrow)).toBeCloseTo(-0.5, 6);
    expect(bandUToTextureS(1, uSpanNarrow)).toBeCloseTo(1.5, 6);

    const planeW = 2;
    const planeH = 1;
    const uSpanWide = labelImageUSpan(planeW, planeH, 4, 1);
    expect(uSpanWide).toBeCloseTo(2, 6);
    expect(bandUToTextureS(0, uSpanWide)).toBeCloseTo(-0.5, 6);
    expect(bandUToTextureS(0.5, uSpanWide)).toBeCloseTo(0.5, 6);
    expect(bandUToTextureS(1, uSpanWide)).toBeCloseTo(1.5, 6);
  });
});
