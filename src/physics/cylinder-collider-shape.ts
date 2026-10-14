import {
  effectiveCylinderCornerRadiusM,
  type CylinderParams,
} from '@/scene/asset-cylinder';
import { PHYSICS_COLLIDER_MARGIN_M } from './constants';

const RAPIER_ROUND_CYLINDER_MIN_M = 0.0001;

export interface CylinderColliderShape {
  halfHeightM: number;
  radiusM: number;
  borderRadiusM: number;
  /** Collider center offset from foot pivot along local +Y (meters). */
  centerOffsetY: number;
}

export function cylinderVolumeM3(params: CylinderParams): number {
  return Math.PI * params.radiusM * params.radiusM * params.heightM;
}

export function cylinderColliderShapeFromParams(
  params: CylinderParams,
): CylinderColliderShape {
  const meshHalfHeight = params.heightM * 0.5;
  const meshRadius = params.radiusM;
  const borderRadiusM = effectiveCylinderCornerRadiusM(params);
  const marginM = PHYSICS_COLLIDER_MARGIN_M;
  const centerOffsetY = meshHalfHeight;

  if (borderRadiusM > 0) {
    return {
      halfHeightM: Math.max(
        meshHalfHeight + marginM - borderRadiusM,
        RAPIER_ROUND_CYLINDER_MIN_M,
      ),
      radiusM: Math.max(meshRadius + marginM - borderRadiusM, RAPIER_ROUND_CYLINDER_MIN_M),
      borderRadiusM,
      centerOffsetY,
    };
  }

  return {
    halfHeightM: meshHalfHeight + marginM,
    radiusM: meshRadius + marginM,
    borderRadiusM: 0,
    centerOffsetY,
  };
}
