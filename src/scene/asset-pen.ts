import { builtinProfileFile } from '@/scene/profile-library';
import { builtinLatheProfileUrl } from '@/constants/builtin-profile-paths';
import type { AssetKind } from './asset-kind';
import { MM_TO_M } from '@/units/length';
import { LATHE_PROFILE_METRICS_MM } from '@/data/lathe-profile-metrics.generated';

export type PenBodyProfile = 'marker' | 'fountain';

export interface PenParams {
  penBodyProfile: PenBodyProfile;
}

/** Shipped profile SVG per pen profile (public/profiles/lathe, 1 unit = 1 mm). */
const PEN_SVG_FILE: Record<PenBodyProfile, string> = {
  marker: builtinProfileFile('pen-marker'),
  fountain: builtinProfileFile('pen-fountain'),
};

export interface PenFootprintM {
  widthM: number;
  heightM: number;
}

/** Measured from the profile SVG: `widthM` = max radius, `heightM` = overall length. */
export function penNominalFootprintM(profile: PenBodyProfile): PenFootprintM {
  const { bounds } = LATHE_PROFILE_METRICS_MM[PEN_SVG_FILE[profile]];
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

export function penSvgUrl(profile: PenBodyProfile): string {
  return builtinLatheProfileUrl(PEN_SVG_FILE[profile]);
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
