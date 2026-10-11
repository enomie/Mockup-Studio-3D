import { describe, expect, it } from 'vitest';
import {
  computeLabelBandHeightMm,
  computeLabelUnfoldAspect,
  computeLabelUnfoldForProfile,
  computeLabelUnfoldPixelsRounded,
  imageMatchesLabelUnfoldAspect,
  labelUnfoldPixelsForReferenceDpis,
} from './beverage-can-label-unfold';

describe('beverage-can-label-unfold', () => {
  it('label band height subtracts 5 mm bottom metal only', () => {
    expect(computeLabelBandHeightMm(115.2)).toBeCloseTo(110.2, 6);
    expect(computeLabelBandHeightMm(146.05)).toBeCloseTo(141.05, 6);
  });

  it('standard 330 ml label sleeve unfold', () => {
    const unfold = computeLabelUnfoldForProfile('standard');
    expect(unfold.bodyDiameterMm).toBe(66);
    expect(unfold.heightMm).toBeCloseTo(110.2, 6);
    expect(unfold.circumferenceMm).toBeCloseTo(Math.PI * 66, 6);
    expect(unfold.widthMm).toBeCloseTo(207.345122089, 3);

    const aspect = computeLabelUnfoldAspect(unfold);
    expect(aspect.widthOverHeight).toBeCloseTo(1.88153, 4);
  });

  it('sleek 330 ml label sleeve unfold', () => {
    const unfold = computeLabelUnfoldForProfile('sleek');
    expect(unfold.bodyDiameterMm).toBeCloseTo(57.4, 6);
    expect(unfold.heightMm).toBeCloseTo(141.05, 6);
    expect(unfold.circumferenceMm).toBeCloseTo(Math.PI * (574 / 10), 6);
    expect(unfold.widthMm).toBeCloseTo(180.327418316, 3);

    const aspect = computeLabelUnfoldAspect(unfold);
    expect(aspect.widthOverHeight).toBeCloseTo(1.27846, 4);
  });

  it('reference DPI pixel sizes for standard', () => {
    const px = labelUnfoldPixelsForReferenceDpis('standard');
    expect(px[72]).toEqual({ dpi: 72, widthPx: 588, heightPx: 312 });
    expect(px[150]).toEqual({ dpi: 150, widthPx: 1224, heightPx: 651 });
    expect(px[300]).toEqual({ dpi: 300, widthPx: 2449, heightPx: 1302 });
  });

  it('reference DPI pixel sizes for sleek', () => {
    const px = labelUnfoldPixelsForReferenceDpis('sleek');
    expect(px[72]).toEqual({ dpi: 72, widthPx: 511, heightPx: 400 });
    expect(px[150]).toEqual({ dpi: 150, widthPx: 1065, heightPx: 833 });
    expect(px[300]).toEqual({ dpi: 300, widthPx: 2130, heightPx: 1666 });
  });

  it('detects matching image aspect', () => {
    const unfold = computeLabelUnfoldForProfile('standard');
    const rounded = computeLabelUnfoldPixelsRounded(unfold, 300);
    expect(imageMatchesLabelUnfoldAspect(rounded.widthPx, rounded.heightPx, unfold)).toBe(true);
    expect(imageMatchesLabelUnfoldAspect(1000, 1000, unfold)).toBe(false);
  });
});
