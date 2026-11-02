import { clamp } from '@/units/math';
import { MM_TO_M } from '@/units/length';
import type { AssetKind } from './asset-kind';
import type { ProfileEntry } from './profile-library';
import {
  canonicalProfileId,
  findProfile,
  registeredProfileMetrics,
} from './profile-registry';

/** Object Extrusion: any profile pushed along Z by `depthM`. */
export interface ExtrusionParams {
  /** Profile id (built-in or user). */
  profileId: string;
  depthM: number;
}

export const DEFAULT_EXTRUSION_PROFILE_ID = 'extrude-rounded-rect';
export const EXTRUSION_DEPTH_DEFAULT_M = 0.02;
export const EXTRUSION_DEPTH_MIN_M = 0.0005;
export const EXTRUSION_DEPTH_MAX_M = 2;
/** Profiles have up to ten path slots; the extrusion has one part per slot. */
export const EXTRUSION_PATH_SLOT_COUNT = 10;

export function isExtrusionAssetKind(kind: AssetKind): kind is 'extrusion' {
  return kind === 'extrusion';
}

export function defaultExtrusionParams(): ExtrusionParams {
  return { profileId: DEFAULT_EXTRUSION_PROFILE_ID, depthM: EXTRUSION_DEPTH_DEFAULT_M };
}

export function cloneExtrusionParams(params: ExtrusionParams): ExtrusionParams {
  return { ...params };
}

export function clampExtrusionParams(
  partial: Partial<ExtrusionParams>,
  base: ExtrusionParams,
): ExtrusionParams {
  const merged = { ...base, ...partial };
  return {
    profileId: canonicalProfileId(merged.profileId || DEFAULT_EXTRUSION_PROFILE_ID),
    depthM: clamp(
      Number.isFinite(merged.depthM) ? merged.depthM : EXTRUSION_DEPTH_DEFAULT_M,
      EXTRUSION_DEPTH_MIN_M,
      EXTRUSION_DEPTH_MAX_M,
    ),
  };
}

export interface ResolvedExtrusionProfile {
  entry: ProfileEntry;
  /** True when the requested profile is gone (the default profile is used). */
  missing: boolean;
}

export function resolveExtrusionProfile(profileId: string): ResolvedExtrusionProfile {
  const entry = findProfile(profileId);
  if (entry && entry.paths.length > 0) {
    return { entry, missing: false };
  }
  const fallback = findProfile(DEFAULT_EXTRUSION_PROFILE_ID);
  if (!fallback) {
    throw new Error('Built-in extrusion profile missing');
  }
  return { entry: fallback, missing: true };
}

export interface ExtrusionSizeM {
  widthM: number;
  heightM: number;
  depthM: number;
}

/** Bounding size at sizeScale = 1 (profile width and height, extrusion depth). */
export function extrusionSizeM(params: ExtrusionParams): ExtrusionSizeM {
  const metrics = registeredProfileMetrics(resolveExtrusionProfile(params.profileId).entry);
  const bounds = metrics?.bounds ?? { minX: 0, maxX: 100, minY: 0, maxY: 60 };
  return {
    widthM: Math.max(bounds.maxX - bounds.minX, 1e-3) * MM_TO_M,
    heightM: Math.max(bounds.maxY - bounds.minY, 1e-3) * MM_TO_M,
    depthM: params.depthM,
  };
}
