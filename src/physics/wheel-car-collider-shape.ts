import { wheelCarDimensionsM } from '@/scene/asset-wheel-car';
import { PHYSICS_COLLIDER_MARGIN_M } from './constants';

export interface WheelCarColliderShape {
  halfHeightM: number;
  radiusM: number;
  /** Collider center offset from foot pivot (meters). */
  centerOffsetY: number;
}

export function wheelCarVolumeM3(sizeScale: number): number {
  const params = wheelCarDimensionsM(sizeScale);
  return Math.PI * params.outerRadiusM * params.outerRadiusM * params.tireWidthM;
}

/** Collider from the SVG-measured wheel size × `sizeScale`. */
export function wheelCarColliderShapeFromSizeScale(sizeScale: number): WheelCarColliderShape {
  const params = wheelCarDimensionsM(sizeScale);
  const marginM = PHYSICS_COLLIDER_MARGIN_M;
  return {
    halfHeightM: params.tireWidthM * 0.5 + marginM,
    radiusM: params.outerRadiusM + marginM,
    centerOffsetY: params.outerRadiusM,
  };
}
