import type { AssetKind } from './asset-kind';
import { MM_TO_M } from '@/units/length';
import {
  canonicalProfileId,
  registeredProfileMetrics,
  resolveAssetProfile,
  type ResolvedAssetProfile,
} from './profile-registry';

/** Profile id of the pen (any profile); legacy 'marker' / 'fountain' still resolve. */
export type PenBodyProfile = string;

export const DEFAULT_PEN_PROFILE_ID = 'pen-marker';
/** Pen parts by profile slot: 0 cap, 1 ring, 2 body (required). */
const PEN_BODY_SLOT = 2;

/** The profile a pen uses; falls back to Marker when it is missing or has no body path. */
export function resolvePenProfile(profile: PenBodyProfile): ResolvedAssetProfile {
  return resolveAssetProfile(profile, [PEN_BODY_SLOT], DEFAULT_PEN_PROFILE_ID);
}

export interface PenParams {
  penBodyProfile: PenBodyProfile;
}

export interface PenFootprintM {
  widthM: number;
  heightM: number;
}

/** Measured from the profile SVG: `widthM` = max radius, `heightM` = overall length. */
export function penNominalFootprintM(profile: PenBodyProfile): PenFootprintM {
  const metrics = registeredProfileMetrics(resolvePenProfile(profile).entry);
  if (!metrics) {throw new Error('Pen profile has no metrics');}
  const { bounds } = metrics;
  return {
    widthM: bounds.maxX * MM_TO_M,
    heightM: (bounds.maxY - bounds.minY) * MM_TO_M,
  };
}

export function penFootprintAspect(profile: PenBodyProfile): number {
  const { widthM, heightM } = penNominalFootprintM(profile);
  if (heightM <= 0) {
    return 1;
  }
  return widthM / heightM;
}

export function defaultPenParams(profile: PenBodyProfile = DEFAULT_PEN_PROFILE_ID): PenParams {
  return {
    penBodyProfile: canonicalProfileId(profile),
  };
}

function resolvePenParams(
  partial: Partial<PenParams> | undefined,
  profile: PenBodyProfile = DEFAULT_PEN_PROFILE_ID,
): PenParams {
  return {
    penBodyProfile: canonicalProfileId(partial?.penBodyProfile ?? profile),
  };
}

export function clonePenParams(params: PenParams): PenParams {
  return resolvePenParams(params);
}

export function isPenAssetKind(kind: AssetKind): kind is 'pen' {
  return kind === 'pen';
}

export function clampPenParams(
  partial: Partial<PenParams>,
  base: PenParams,
): PenParams {
  return resolvePenParams({ ...base, ...partial }, base.penBodyProfile);
}
