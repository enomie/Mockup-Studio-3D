import { describe, expect, it } from 'vitest';
import {
  bandUToTextureS,
  computeLabelPrintableBandMm,
  computeLabelPrintableBandHeightMm,
  imageMatchesPrintableBandAspect,
  labelImageUSpan,
} from './beverage-can-label-unfold';

describe('beverage-can label height-fit', () => {
  it('printable band height is can height minus bottom metal and top ring', () => {
    expect(computeLabelPrintableBandHeightMm(115.2)).toBeCloseTo(107.7, 6);
    expect(computeLabelPrintableBandHeightMm(146.05)).toBeCloseTo(138.55, 6);
  });

  it('standard printable band aspect matches legacy sleeve table', () => {
    const band = computeLabelPrintableBandMm('standard');
    expect(band.heightMm).toBeCloseTo(107.7, 6);
    expect(band.widthMm / band.heightMm).toBeCloseTo(1.92521, 4);
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
