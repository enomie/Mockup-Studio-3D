import type { AssetKind } from './asset-kind';
import { clamp } from '@/units/math';
import { MM_TO_M } from '@/units/length';
import type { LatheBoundsMm } from '@/engine/lathe-svg-metrics';
import type { ProfileEntry } from './profile-library';
import {
  canonicalProfileId,
  findProfile,
  registeredProfileMetrics,
} from './profile-registry';

/**
 * Profile id of the bottle body (any profile: built-in or user). Legacy short names
 * ('bordeaux', 'alsace', 'sparkling') are still accepted and normalised.
 */
export type WineBottleBodyProfile = string;

export const DEFAULT_WINE_BOTTLE_PROFILE_ID = 'bottle-bordeaux';

/** Profile slot of the glass wall; the bottle needs it. */
const GLASS_SLOT = 0;

export interface ResolvedWineBottleProfile {
  entry: ProfileEntry;
  /** True when the requested profile is gone or has no glass path (Bordeaux is used). */
  missing: boolean;
}

function glassBounds(entry: ProfileEntry): LatheBoundsMm | null {
  return registeredProfileMetrics(entry)?.slots[GLASS_SLOT] ?? null;
}

/** The profile a bottle uses; falls back to Bordeaux when it is missing or unusable. */
export function resolveWineBottleProfile(id: WineBottleBodyProfile): ResolvedWineBottleProfile {
  const entry = findProfile(id);
  if (entry && glassBounds(entry)) {
    return { entry, missing: false };
  }
  const fallback = findProfile(DEFAULT_WINE_BOTTLE_PROFILE_ID);
  if (!fallback) {
    throw new Error('Built-in Bordeaux profile missing');
  }
  return { entry: fallback, missing: true };
}

export type WineBottleLabelSizeMode = 'height' | 'width';
export type WineBottleLabelWrap = 'full' | 'partial';

export interface WineBottleParams {
  wineBottleBodyProfile: WineBottleBodyProfile;
  /** Glass height (`path_red`) — measured from the profile SVG (not user-editable). */
  heightM: number;
  wallThicknessM: number;
  labelBottomOffsetM: number;
  labelSizeMode: WineBottleLabelSizeMode;
  labelSizeM: number;
  labelWrap: WineBottleLabelWrap;
}

/**
 * Transmission `meshDepthM` = `wallThicknessM` × this (hollow glass stacks many shader hits).
 */
export const WINE_BOTTLE_GLASS_TRANSMISSION_MESH_DEPTH_FACTOR = 0.4;

const WALL_THICKNESS_DEFAULT = 0.0025;

function wineBottleBoundsMm(profile: WineBottleBodyProfile): LatheBoundsMm {
  const { entry } = resolveWineBottleProfile(profile);
  const metrics = registeredProfileMetrics(entry);
  if (!metrics) {throw new Error(`No metrics for profile ${entry.id}`);}
  return metrics.bounds;
}

function wineBottleGlassBoundsMm(profile: WineBottleBodyProfile): LatheBoundsMm {
  const bounds = glassBounds(resolveWineBottleProfile(profile).entry);
  if (!bounds) {throw new Error('Wine bottle profile has no glass path');}
  return bounds;
}

/** Glass height (`path_red`) measured from the profile (sizeScale = 1). */
export function wineBottleNominalHeightM(profile: WineBottleBodyProfile): number {
  const b = wineBottleGlassBoundsMm(profile);
  return (b.maxY - b.minY) * MM_TO_M;
}

/** Overall height incl. capsule disc on top (sizeScale = 1). */
export function wineBottleOverallHeightM(profile: WineBottleBodyProfile): number {
  const b = wineBottleBoundsMm(profile);
  return (b.maxY - b.minY) * MM_TO_M;
}

/** SVG y of the glass foot (mm) — maps to lathe y = 0 for every bottle part. */
export function wineBottleFootYMm(profile: WineBottleBodyProfile): number {
  return wineBottleGlassBoundsMm(profile).maxY;
}

/** Max belly outer diameter measured from the profile SVG (sizeScale = 1). */
export function wineBottleMaxOuterDiameterM(profile: WineBottleBodyProfile): number {
  return wineBottleGlassBoundsMm(profile).maxX * 2 * MM_TO_M;
}

/** Footprint width / body height for transform readouts (belly diameter, not label). */
export function wineBottleFootprintAspect(
  profile: WineBottleBodyProfile,
  heightM: number,
): number {
  if (heightM <= 0) {return 1;}
  return wineBottleMaxOuterDiameterM(profile) / heightM;
}

const LABEL_SIZE_MIN = 0.02;
const LABEL_SIZE_MAX = 0.25;

export function defaultWineBottleParams(
  profile: WineBottleBodyProfile = DEFAULT_WINE_BOTTLE_PROFILE_ID,
): WineBottleParams {
  return {
    wineBottleBodyProfile: canonicalProfileId(profile),
    heightM: wineBottleNominalHeightM(profile),
    wallThicknessM: WALL_THICKNESS_DEFAULT,
    labelBottomOffsetM: 0.05,
    labelSizeMode: 'height',
    labelSizeM: 0.09,
    labelWrap: 'partial',
  };
}

export function cloneWineBottleParams(params: WineBottleParams): WineBottleParams {
  return { ...params };
}

export function isWineBottleAssetKind(kind: AssetKind): kind is 'wine-bottle' {
  return kind === 'wine-bottle';
}

export function resolvedLabelWidthHeight(
  params: WineBottleParams,
  imageAspect: number,
): { labelWidthM: number; labelHeightM: number } {
  const aspect = imageAspect > 0 ? imageAspect : 4 / 3;
  if (params.labelSizeMode === 'height') {
    const labelHeightM = params.labelSizeM;
    return { labelWidthM: labelHeightM * aspect, labelHeightM };
  }
  const labelWidthM = params.labelSizeM;
  return { labelWidthM, labelHeightM: labelWidthM / aspect };
}

export function scaledWineBottleParams(
  params: WineBottleParams,
  sizeScale: number,
): WineBottleParams {
  const s = sizeScale;
  return {
    ...params,
    heightM: params.heightM * s,
    wallThicknessM: params.wallThicknessM * s,
    labelBottomOffsetM: params.labelBottomOffsetM * s,
    labelSizeM: params.labelSizeM * s,
  };
}

export function clampWineBottleParams(
  partial: Partial<WineBottleParams>,
  base: WineBottleParams,
): WineBottleParams {
  const profile = canonicalProfileId(partial.wineBottleBodyProfile ?? base.wineBottleBodyProfile);
  const profileDefaults =
    partial.wineBottleBodyProfile !== undefined &&
    profile !== canonicalProfileId(base.wineBottleBodyProfile)
      ? defaultWineBottleParams(profile)
      : null;

  const merged: WineBottleParams = {
    ...(profileDefaults ?? base),
    ...partial,
    wineBottleBodyProfile: profile,
  };
  // Legacy scenes stored capsule sizes; capsule, disc and cork now come from the profile SVG.
  delete (merged as unknown as Record<string, unknown>).capsuleFoilHeightM;
  delete (merged as unknown as Record<string, unknown>).capsuleDiscHeightM;

  // Size comes from the profile SVG — stored values are ignored.
  const heightM = wineBottleNominalHeightM(profile);
  const labelBottomOffsetM = clamp(merged.labelBottomOffsetM, 0, heightM * 0.85);
  const labelSizeM = clamp(merged.labelSizeM, LABEL_SIZE_MIN, LABEL_SIZE_MAX);

  return {
    ...merged,
    heightM,
    wallThicknessM: clamp(merged.wallThicknessM, 0.001, 0.006),
    labelBottomOffsetM,
    labelSizeM,
    labelSizeMode: merged.labelSizeMode === 'width' ? 'width' : 'height',
    labelWrap: merged.labelWrap === 'full' ? 'full' : 'partial',
  };
}
