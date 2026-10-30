import { builtinLatheProfileUrl } from '@/constants/builtin-profile-paths';
import type { AssetKind } from './asset-kind';
import {
  BEVERAGE_CAN_LABEL_METAL_ZONES_MM,
  computeLabelBandHeightMm,
  nominalForProfile,
  type BeverageCanBodyProfile,
} from '@/engine/beverage-can-label-unfold';
import {
  TIN_CAN_END_RING_HEIGHT_MM,
  TIN_CAN_END_RING_THICKNESS_MM,
} from '@/scene/asset-tin-can';
import { MM_TO_M } from '@/units/length';
import { clamp } from '@/units/math';

export type { BeverageCanBodyProfile };

export interface BeverageCanParams {
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
  /**
   * Lathe ring: rectangle (radial × vertical) revolved around Y; this is the **center** radius (mm).
   * Defaults: `BEVERAGE_CAN_DEFAULT_TOP_RING_CENTER_RADIUS_MM`.
   */
  topRingCenterRadiusMm: number;
  /** Radial width of the ring cross-section (m) — tin-can lip 1.5 mm. */
  topRingThicknessM: number;
  closureOuterDiameterM: number;
  closureInnerDiameterM: number;
}

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

/**
 * Top ring **center** radius (mm) at sizeScale = 1 — edit here for Standard vs Sleek.
 * Outer = center + `TIN_CAN_END_RING_THICKNESS_MM` / 2, inner = center − thickness / 2.
 */
export const BEVERAGE_CAN_DEFAULT_TOP_RING_CENTER_RADIUS_MM: Record<
  BeverageCanBodyProfile,
  number
> = {
  standard: 25.5,
  sleek: 25.5,
};

const TOP_RING_CENTER_RADIUS_MM_MIN = 20;
const TOP_RING_CENTER_RADIUS_MM_MAX = 45;

/** Top end ring — centered on `heightM` like tin can `endRingYBounds` (top). */
export function beverageCanTopRingYBounds(params: BeverageCanParams): {
  y0: number;
  y1: number;
  centerY: number;
} {
  const h = params.topRingHeightM;
  const half = h * 0.5;
  const centerY = params.heightM;
  return { y0: centerY - half, y1: centerY + half, centerY };
}

export function beverageCanSvgUrl(profile: BeverageCanBodyProfile): string {
  return profile === 'standard'
    ? builtinLatheProfileUrl('lathe-y-can-330ml-classic.svg')
    : builtinLatheProfileUrl('lathe-y-can-330ml-sleek.svg');
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
    topRingHeightM: TIN_CAN_END_RING_HEIGHT_MM * MM_TO_M,
    topRingCenterRadiusMm: BEVERAGE_CAN_DEFAULT_TOP_RING_CENTER_RADIUS_MM[profile],
    topRingThicknessM: TIN_CAN_END_RING_THICKNESS_MM * MM_TO_M,
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
    topRingHeightM: params.topRingHeightM * s,
    topRingCenterRadiusMm: params.topRingCenterRadiusMm * s,
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

  const partialLegacy = partial as Partial<BeverageCanParams> & {
    topRingOuterRadiusMm?: number;
  };
  const merged: BeverageCanParams = {
    ...(profileDefaults ?? base),
    ...partial,
    canBodyProfile: profile,
  };
  if (
    partial.topRingCenterRadiusMm === undefined &&
    partialLegacy.topRingOuterRadiusMm !== undefined
  ) {
    merged.topRingCenterRadiusMm =
      partialLegacy.topRingOuterRadiusMm - TIN_CAN_END_RING_THICKNESS_MM / 2;
  }

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
    topRingCenterRadiusMm: clamp(
      merged.topRingCenterRadiusMm,
      TOP_RING_CENTER_RADIUS_MM_MIN,
      TOP_RING_CENTER_RADIUS_MM_MAX,
    ),
    topRingThicknessM: clamp(merged.topRingThicknessM, 0.0005, 0.005),
    neckLengthM: clamp(merged.neckLengthM, 0.005, 0.03),
    bottomDomeInsetM: clamp(merged.bottomDomeInsetM, 0.001, 0.01),
    bottomStandDiameterM: clamp(merged.bottomStandDiameterM, 0.02, diameterM),
    bottomMetalBandM: clamp(merged.bottomMetalBandM, 0, labelBottomOffsetM + 0.001),
  };
}
