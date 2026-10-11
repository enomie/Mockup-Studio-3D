import {
  labelBandYBounds,
  type TinCanParams,
} from '@/scene/asset-tin-can';
import { MM_TO_M } from '@/units/length';

export type LabelUnfoldMm = {
  unfoldWidthMm: number;
  unfoldHeightMm: number;
};

export function computeTinCanLabelUnfoldFromParams(params: TinCanParams): LabelUnfoldMm {
  const { labelY0, labelY1 } = labelBandYBounds(params);
  return {
    unfoldWidthMm: 2 * Math.PI * (params.bodyRadiusM / MM_TO_M),
    unfoldHeightMm: (labelY1 - labelY0) / MM_TO_M,
  };
}

export function computeTinCanLabelUnfoldAspect(params: TinCanParams): {
  widthOverHeight: number;
} {
  const { unfoldWidthMm, unfoldHeightMm } = computeTinCanLabelUnfoldFromParams(params);
  if (unfoldHeightMm <= 0) {
    return { widthOverHeight: 1 };
  }
  return { widthOverHeight: unfoldWidthMm / unfoldHeightMm };
}
