import { defaultSphereParams, type SphereParams } from '@/scene/asset-sphere';
import { PHYSICS_COLLIDER_MARGIN_M } from './constants';

export interface SphereColliderShape {
  colliderRadiusM: number;
  /** Collider center offset from foot pivot along local +Y (meters). */
  centerOffsetY: number;
}

export function sphereVolumeM3(params: SphereParams): number {
  const r = params.radiusM;
  return (4 / 3) * Math.PI * r * r * r;
}

export function sphereColliderShapeFromParams(params: SphereParams): SphereColliderShape {
  const marginM = PHYSICS_COLLIDER_MARGIN_M;
  return {
    colliderRadiusM: params.radiusM + marginM,
    centerOffsetY: params.radiusM,
  };
}

export function sphereColliderShapeFromEntityParams(
  params: SphereParams | undefined,
): SphereColliderShape {
  return sphereColliderShapeFromParams(params ?? defaultSphereParams());
}
