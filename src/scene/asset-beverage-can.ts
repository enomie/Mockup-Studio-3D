import { builtinLatheProfileUrl } from '@/constants/builtin-profile-paths';
import type { AssetKind } from './asset-kind';
import {
  BEVERAGE_CAN_LABEL_METAL_ZONES_MM,
  nominalForProfile,
  type BeverageCanBodyProfile,
} from '@/engine/beverage-can-label-unfold';
import {
  BEVERAGE_CAN_SVG_FILE,
  beverageCanProfileMm,
} from '@/scene/beverage-can-profile-metrics';
import { MM_TO_M } from '@/units/length';
import { clamp } from '@/units/math';

export type { BeverageCanBodyProfile };

export interface BeverageCanParams {
  canBodyProfile: BeverageCanBodyProfile;
  /** Overall height incl. top ring — measured from the profile SVG (not user-editable). */
  heightM: number;
  neckLengthM: number;
  bottomDomeInsetM: number;
  /** Body outside diameter — measured from the profile SVG (not user-editable). */
  diameterM: number;
  bottomStandDiameterM: number;
  labelHeightM: number;
  labelBottomOffsetM: number;
  bottomMetalBandM: number;
  closureOuterDiameterM: number;
  closureInnerDiameterM: number;
}

const LABEL_HEIGHT_MIN = 0.02;

const PROFILE_NECK_LENGTH_M: Record<BeverageCanBodyProfile, number> = {
  standard: 0.01834,
  sleek: 0.0105,
};

const PROFILE_BOTTOM_DOME_M: Record<BeverageCanBodyProfile, number> = {
  standard: 0.0035,
  sleek: 0.004,
};

const PROFILE_STAND_DIAMETER_M: Record<BeverageCanBodyProfile, number> = {
  standard: 0.04732,
  sleek: 0.04724,
};

/**
 * Label band top (top ring underside) above the foot, in the same scale as `params`
 * (pass scaled params to get the scaled value).
 */
export function beverageCanLabelTopM(params: BeverageCanParams): number {
  const mm = beverageCanProfileMm(params.canBodyProfile);
  return (mm.labelTopFromFootMm / mm.heightMm) * params.heightM;
}

export function beverageCanSvgUrl(profile: BeverageCanBodyProfile): string {
  return builtinLatheProfileUrl(BEVERAGE_CAN_SVG_FILE[profile]);
}

export function defaultBeverageCanParams(
  profile: BeverageCanBodyProfile = 'standard',
): BeverageCanParams {
  const nominal = nominalForProfile(profile);

  return {
    canBodyProfile: profile,
    heightM: nominal.heightM,
    neckLengthM: PROFILE_NECK_LENGTH_M[profile],
    bottomDomeInsetM: PROFILE_BOTTOM_DOME_M[profile],
    diameterM: nominal.diameterM,
    bottomStandDiameterM: PROFILE_STAND_DIAMETER_M[profile],
    labelHeightM: nominal.labelHeightM,
    labelBottomOffsetM: BEVERAGE_CAN_LABEL_METAL_ZONES_MM.bottomMetalBandMm * MM_TO_M,
    bottomMetalBandM: BEVERAGE_CAN_LABEL_METAL_ZONES_MM.bottomMetalBandMm * MM_TO_M,
    closureOuterDiameterM: 0.054,
    closureInnerDiameterM: 0.0524,
  };
}

export function cloneBeverageCanParams(params: BeverageCanParams): BeverageCanParams {
  return { ...params };
}

export function isBeverageCanAssetKind(kind: AssetKind): kind is 'beverage-can' {
  return kind === 'beverage-can';
}

export function scaledBeverageCanParams(
  params: BeverageCanParams,
  sizeScale: number,
): BeverageCanParams {
  const s = sizeScale;
  return {
    ...params,
    heightM: params.heightM * s,
    neckLengthM: params.neckLengthM * s,
    bottomDomeInsetM: params.bottomDomeInsetM * s,
    diameterM: params.diameterM * s,
    bottomStandDiameterM: params.bottomStandDiameterM * s,
    labelHeightM: params.labelHeightM * s,
    labelBottomOffsetM: params.labelBottomOffsetM * s,
    bottomMetalBandM: params.bottomMetalBandM * s,
    closureOuterDiameterM: params.closureOuterDiameterM * s,
    closureInnerDiameterM: params.closureInnerDiameterM * s,
  };
}

export function clampBeverageCanParams(
  partial: Partial<BeverageCanParams>,
  base: BeverageCanParams,
): BeverageCanParams {
  const profile = partial.canBodyProfile ?? base.canBodyProfile;
  const profileDefaults =
    partial.canBodyProfile !== undefined && partial.canBodyProfile !== base.canBodyProfile
      ? defaultBeverageCanParams(profile)
      : null;

  const merged = {
    ...(profileDefaults ?? base),
    ...partial,
    canBodyProfile: profile,
  };
  // Legacy scenes stored a parametric top ring; the ring now comes from the profile SVG.
  delete (merged as Record<string, unknown>).topRingHeightM;
  delete (merged as Record<string, unknown>).topRingCenterRadiusMm;
  delete (merged as Record<string, unknown>).topRingThicknessM;
  delete (merged as Record<string, unknown>).topRingOuterRadiusMm;

  // Size comes from the profile SVG — stored values are ignored.
  const nominal = nominalForProfile(profile);
  const heightM = nominal.heightM;
  const diameterM = nominal.diameterM;
  const labelBottomOffsetM = merged.labelBottomOffsetM;
  const labelHeightM = clamp(
    merged.labelHeightM,
    LABEL_HEIGHT_MIN,
    heightM - labelBottomOffsetM,
  );

  return {
    ...merged,
    heightM,
    diameterM,
    labelHeightM,
    labelBottomOffsetM: clamp(labelBottomOffsetM, 0, heightM * 0.2),
    neckLengthM: clamp(merged.neckLengthM, 0.005, 0.03),
    bottomDomeInsetM: clamp(merged.bottomDomeInsetM, 0.001, 0.01),
    bottomStandDiameterM: clamp(merged.bottomStandDiameterM, 0.02, diameterM),
    bottomMetalBandM: clamp(merged.bottomMetalBandM, 0, labelBottomOffsetM + 0.001),
  };
}
