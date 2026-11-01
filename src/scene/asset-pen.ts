import { builtinLatheProfileUrl } from '@/constants/builtin-profile-paths';
import type { AssetKind } from './asset-kind';
import { MM_TO_M } from '@/units/length';

export type PenBodyProfile = 'marker' | 'fountain';

export interface PenParams {
  penBodyProfile: PenBodyProfile;
}

/** Shipped `pen-*.svg` viewBox (1 unit = 1 mm). */
export const PEN_PROFILE_VIEWBOX_WIDTH_MM = 10;
const PEN_PROFILE_VIEWBOX_HEIGHT_MM = 200;

export interface PenFootprintM {
  widthM: number;
  heightM: number;
}

export function penNominalFootprintM(profile: PenBodyProfile): PenFootprintM {
  switch (profile) {
    case 'marker':
    case 'fountain':
      break;
  }
  return {
    widthM: PEN_PROFILE_VIEWBOX_WIDTH_MM * MM_TO_M,
    heightM: PEN_PROFILE_VIEWBOX_HEIGHT_MM * MM_TO_M,
  };
}

export function penFootprintAspect(profile: PenBodyProfile): number {
  const { widthM, heightM } = penNominalFootprintM(profile);
  if (heightM <= 0) {
    return 1;
  }
  return widthM / heightM;
}

export function penSvgUrl(profile: PenBodyProfile): string {
  return profile === 'marker'
    ? builtinLatheProfileUrl('lathe-y-pen-marker.svg')
    : builtinLatheProfileUrl('lathe-y-pen-fountain.svg');
}

export function defaultPenParams(profile: PenBodyProfile = 'marker'): PenParams {
  return {
    penBodyProfile: profile,
  };
}

function resolvePenParams(
  partial: Partial<PenParams> | undefined,
  profile: PenBodyProfile = 'marker',
): PenParams {
  return {
    penBodyProfile: partial?.penBodyProfile ?? profile,
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
