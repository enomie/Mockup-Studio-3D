import type { AssetKind } from './asset-kind';
import {
  BEVERAGE_CAN_LABEL_METAL_ZONES_MM,
  computeLabelBandHeightMm,
  nominalForProfile,
  type BeverageCanBodyProfile,
} from '@/engine/beverage-can-label-unfold';
import { MM_TO_M } from '@/units/length';
import { clamp } from '@/units/math';

export type { BeverageCanBodyProfile };

export type BeverageCanParams = {
  canBodyProfile: BeverageCanBodyProfile;
  heightM: number;
  neckLengthM: number;
  bottomDomeInsetM: number;
  diameterM: number;
  bottomStandDiameterM: number;
  labelHeightM: number;
  labelBottomOffsetM: number;
  bottomMetalBandM: number;
  topRingHeightM: number;
  topRingThicknessM: number;
  closureOuterDiameterM: number;
  closureInnerDiameterM: number;
};

const HEIGHT_MIN = 0.05;
const HEIGHT_MAX = 0.3;
const DIAMETER_MIN = 0.04;
const DIAMETER_MAX = 0.1;
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

export function beverageCanSvgUrl(profile: BeverageCanBodyProfile): string {
  return profile === 'standard' ? '/330ml-classic.svg' : '/330ml-sleek.svg';
}

export function defaultBeverageCanParams(
  profile: BeverageCanBodyProfile = 'standard',
): BeverageCanParams {
  const nominal = nominalForProfile(profile);
  const bodyMm =
    profile === 'standard'
      ? { canHeightMm: 115.2, bodyDiameterMm: 66 }
      : { canHeightMm: 146.05, bodyDiameterMm: 574 / 10 };

  const labelHeightMm = computeLabelBandHeightMm(bodyMm.canHeightMm);

  return {
    canBodyProfile: profile,
    heightM: nominal.heightM,
    neckLengthM: PROFILE_NECK_LENGTH_M[profile],
    bottomDomeInsetM: PROFILE_BOTTOM_DOME_M[profile],
    diameterM: nominal.diameterM,
    bottomStandDiameterM: PROFILE_STAND_DIAMETER_M[profile],
    labelHeightM: labelHeightMm * MM_TO_M,
    labelBottomOffsetM: BEVERAGE_CAN_LABEL_METAL_ZONES_MM.bottomMetalBandMm * MM_TO_M,
    bottomMetalBandM: BEVERAGE_CAN_LABEL_METAL_ZONES_MM.bottomMetalBandMm * MM_TO_M,
    topRingHeightM: BEVERAGE_CAN_LABEL_METAL_ZONES_MM.topRingHeightMm * MM_TO_M,
    topRingThicknessM: 0.0015,
    closureOuterDiameterM: 0.054,
    closureInnerDiameterM: 0.0524,
  };
}

export function cloneBeverageCanParams(params: BeverageCanParams): BeverageCanParams {
  return { ...params };
}

export function isBeverageCanAssetKind(kind: AssetKind): boolean {
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
    topRingHeightM: params.topRingHeightM * s,
    topRingThicknessM: params.topRingThicknessM * s,
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

  const merged: BeverageCanParams = {
    ...(profileDefaults ?? base),
    ...partial,
    canBodyProfile: profile,
  };

  const heightM = clamp(merged.heightM, HEIGHT_MIN, HEIGHT_MAX);
  const diameterM = clamp(merged.diameterM, DIAMETER_MIN, DIAMETER_MAX);
  const topRingHeightM = merged.topRingHeightM;
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
    topRingHeightM: clamp(topRingHeightM, 0.001, heightM * 0.1),
    topRingThicknessM: clamp(merged.topRingThicknessM, 0.0005, 0.005),
    neckLengthM: clamp(merged.neckLengthM, 0.005, 0.03),
    bottomDomeInsetM: clamp(merged.bottomDomeInsetM, 0.001, 0.01),
    bottomStandDiameterM: clamp(merged.bottomStandDiameterM, 0.02, diameterM),
    bottomMetalBandM: clamp(merged.bottomMetalBandM, 0, labelBottomOffsetM + 0.001),
  };
}
