import { describe, expect, it } from 'vitest';
import { defaultTinCanParams, labelBandYBounds } from '@/scene/asset-tin-can';
import {
  computeTinCanLabelUnfoldAspect,
  computeTinCanLabelUnfoldFromParams,
} from './tin-can-label-unfold';

describe('tin-can-label-unfold', () => {
  it('computes default unfold dimensions (full mantle band)', () => {
    const params = defaultTinCanParams();
    const { labelY0, labelY1 } = labelBandYBounds(params);
    const unfold = computeTinCanLabelUnfoldFromParams(params);
    expect(unfold.unfoldHeightMm).toBeCloseTo((labelY1 - labelY0) * 1000, 3);
    expect(unfold.unfoldWidthMm).toBeCloseTo(2 * Math.PI * 36.5, 3);
  });

  it('computes aspect from params', () => {
    const params = defaultTinCanParams();
    const { widthOverHeight } = computeTinCanLabelUnfoldAspect(params);
    const unfold = computeTinCanLabelUnfoldFromParams(params);
    expect(widthOverHeight).toBeCloseTo(
      unfold.unfoldWidthMm / unfold.unfoldHeightMm,
      5,
    );
  });
});
