import { builtinLatheProfileUrl } from '@/constants/builtin-profile-paths';
import type { AssetKind } from './asset-kind';
import { clamp } from '@/units/math';

export type PenBodyProfile = 'marker' | 'fountain';

export interface PenParams {
  penBodyProfile: PenBodyProfile;
  maxRadiusM: number;
}

/** Widest ring path extent in authoring SVG (mm-like units). */
export const PEN_SVG_REFERENCE_MAX_RADIUS = 26.09;

/** Authoring viewBox height used for nominal height derivation. */
export const PEN_SVG_REFERENCE_HEIGHT = 566.93;

/** Body path top in authoring SVG (shared marker/fountain). */
export const PEN_BODY_TOP_OFFSET_SVG = 11.08;

export const PEN_MAX_RADIUS_DEFAULT_M = 0.0065;

const MAX_RADIUS_MIN_M = 0.003;
const MAX_RADIUS_MAX_M = 0.02;

export function penSvgUrl(profile: PenBodyProfile): string {
  return profile === 'marker'
    ? builtinLatheProfileUrl('pen-marker.svg')
    : builtinLatheProfileUrl('pen-fountain.svg');
}

export function computePenHeightM(maxRadiusM: number): number {
  if (maxRadiusM <= 0) {
    return 0;
  }
  return (PEN_SVG_REFERENCE_HEIGHT / PEN_SVG_REFERENCE_MAX_RADIUS) * maxRadiusM;
}

export function defaultPenParams(profile: PenBodyProfile = 'marker'): PenParams {
  return {
    penBodyProfile: profile,
    maxRadiusM: PEN_MAX_RADIUS_DEFAULT_M,
  };
}

export function clonePenParams(params: PenParams): PenParams {
  return { ...params };
}

export function isPenAssetKind(kind: AssetKind): boolean {
  return kind === 'pen';
}

export function scaledPenMaxRadiusM(maxRadiusM: number, sizeScale: number): number {
  return maxRadiusM * sizeScale;
}

export function clampPenParams(
  partial: Partial<PenParams>,
  base: PenParams,
): PenParams {
  const profile = partial.penBodyProfile ?? base.penBodyProfile;
  const merged: PenParams = {
    ...base,
    ...partial,
    penBodyProfile: profile,
  };
  return {
    ...merged,
    maxRadiusM: clamp(merged.maxRadiusM, MAX_RADIUS_MIN_M, MAX_RADIUS_MAX_M),
  };
}
