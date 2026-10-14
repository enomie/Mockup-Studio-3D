import {
  effectiveBlockCornerRadiusM,
  type BlockParams,
} from '@/scene/asset-block';
import { inflateHalfExtentsForPhysics } from './collider-margin';
import { PHYSICS_COLLIDER_MARGIN_M } from './constants';
import type { HalfExtents } from './types';

const RAPIER_ROUND_CUBOID_MIN_HALF_M = 0.0001;

export interface BlockColliderShape {
  halfExtents: HalfExtents;
  borderRadiusM: number;
  /** Collider center offset from foot pivot along local +Y (meters). */
  centerOffsetY: number;
}

/** Box volume for mass (fillet not subtracted — slight overestimate). */
export function blockVolumeM3(params: BlockParams): number {
  return params.widthM * params.heightM * params.depthM;
}

/** Rapier collider matching block mesh: bottom pivot, optional round cuboid fillet. */
export function blockColliderShapeFromParams(params: BlockParams): BlockColliderShape {
  const meshHalfExtents: HalfExtents = {
    x: params.widthM * 0.5,
    y: params.heightM * 0.5,
    z: params.depthM * 0.5,
  };
  const borderRadiusM = effectiveBlockCornerRadiusM(params);
  const marginM = PHYSICS_COLLIDER_MARGIN_M;

  // Rapier roundCuboid: effective outer half-extent = inner half + borderRadius (not mesh half + radius).
  const halfExtents: HalfExtents =
    borderRadiusM > 0
      ? {
          x: Math.max(
            meshHalfExtents.x + marginM - borderRadiusM,
            RAPIER_ROUND_CUBOID_MIN_HALF_M,
          ),
          y: Math.max(
            meshHalfExtents.y + marginM - borderRadiusM,
            RAPIER_ROUND_CUBOID_MIN_HALF_M,
          ),
          z: Math.max(
            meshHalfExtents.z + marginM - borderRadiusM,
            RAPIER_ROUND_CUBOID_MIN_HALF_M,
          ),
        }
      : inflateHalfExtentsForPhysics(meshHalfExtents);

  return {
    halfExtents,
    borderRadiusM,
    centerOffsetY: meshHalfExtents.y,
  };
}
