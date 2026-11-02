import { wheelCarDimensionsM } from '@/scene/asset-wheel-car';
import { PHYSICS_COLLIDER_MARGIN_M } from './constants';

export interface WheelCarColliderShape {
  halfHeightM: number;
  radiusM: number;
  /** Collider center offset from foot pivot (meters). */
  centerOffsetY: number;
}

export function wheelCarVolumeM3(sizeScale: number, profileId?: string): number {
  const params = wheelCarDimensionsM(sizeScale, profileId);
  return Math.PI * params.outerRadiusM * params.outerRadiusM * params.tireWidthM;
}

/** Collider from the profile-measured wheel size × `sizeScale`. */
export function wheelCarColliderShapeFromSizeScale(
  sizeScale: number,
  profileId?: string,
): WheelCarColliderShape {
  const params = wheelCarDimensionsM(sizeScale, profileId);
  const marginM = PHYSICS_COLLIDER_MARGIN_M;
  return {
    halfHeightM: params.tireWidthM * 0.5 + marginM,
    radiusM: params.outerRadiusM + marginM,
    centerOffsetY: params.outerRadiusM,
  };
}
