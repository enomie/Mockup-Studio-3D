import type { AssetKind } from './asset-kind';
import { MM_TO_M } from '@/units/length';
import {
  canonicalProfileId,
  registeredProfileMetrics,
  resolveAssetProfile,
  type ResolvedAssetProfile,
} from './profile-registry';

/**
 * Shape and size come from the profile; the instance scales via `entity.sizeScale`.
 * Spoke width is engine-side (tangential extrusion of the drawn spoke side view).
 */
export interface WheelCarParams {
  spokeCount: 5;
  /** Profile id (any profile, x-lathe: x = axial, y down to the axis). */
  profileId: string;
}

const SPOKE_COUNT = 5 as const;

export const DEFAULT_WHEEL_CAR_PROFILE_ID = 'wheel-car';
/** Wheel parts by profile slot: 0 tire (required), 1 rim outer, 2 rim inner, 6 spoke. */
const WHEEL_TIRE_SLOT = 0;

/** The profile a wheel uses; falls back to the built-in wheel when missing or without a tire. */
export function resolveWheelCarProfile(profileId: string): ResolvedAssetProfile {
  return resolveAssetProfile(profileId, [WHEEL_TIRE_SLOT], DEFAULT_WHEEL_CAR_PROFILE_ID);
}

/** Wheel frame measured from the profile (mm): axis = lowest point (y down), tread = top. */
export interface WheelCarProfileFrameMm {
  axisYMm: number;
  axialCenterMm: number;
  outerRadiusMm: number;
  tireWidthMm: number;
}

export function wheelCarProfileFrameMm(
  profileId: string = DEFAULT_WHEEL_CAR_PROFILE_ID,
): WheelCarProfileFrameMm {
  const metrics = registeredProfileMetrics(resolveWheelCarProfile(profileId).entry);
  if (!metrics) {throw new Error('Wheel profile has no metrics');}
  const { bounds } = metrics;
  const tireWidthMm = bounds.maxX - bounds.minX;
  return {
    axisYMm: bounds.maxY,
    axialCenterMm: bounds.minX + tireWidthMm / 2,
    outerRadiusMm: bounds.maxY - bounds.minY,
    tireWidthMm,
  };
}

export interface WheelCarDimensionsM {
  outerRadiusM: number;
  tireWidthM: number;
}

/** Outer radius and tire width measured from the profile × `sizeScale`. */
export function wheelCarDimensionsM(
  sizeScale = 1,
  profileId: string = DEFAULT_WHEEL_CAR_PROFILE_ID,
): WheelCarDimensionsM {
  const frame = wheelCarProfileFrameMm(profileId);
  return {
    outerRadiusM: frame.outerRadiusMm * MM_TO_M * sizeScale,
    tireWidthM: frame.tireWidthMm * MM_TO_M * sizeScale,
  };
}

export function defaultWheelCarParams(): WheelCarParams {
  return { spokeCount: SPOKE_COUNT, profileId: DEFAULT_WHEEL_CAR_PROFILE_ID };
}

export function cloneWheelCarParams(params: WheelCarParams): WheelCarParams {
  return { ...params };
}

export function isWheelCarAssetKind(kind: AssetKind): kind is 'wheel-car' {
  return kind === 'wheel-car';
}

/** Legacy params (outerRadiusM, rimRadiusM, …) are dropped — sizes come from the profile. */
export function clampWheelCarParams(
  partial: Partial<WheelCarParams>,
  base: WheelCarParams,
): WheelCarParams {
  // Wheels saved before profiles existed have no profile id.
  const legacyBase: Partial<WheelCarParams> = base;
  const profileId = partial.profileId ?? legacyBase.profileId ?? DEFAULT_WHEEL_CAR_PROFILE_ID;
  return { spokeCount: SPOKE_COUNT, profileId: canonicalProfileId(profileId) };
}
