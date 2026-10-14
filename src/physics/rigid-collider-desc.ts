import RAPIER from '@dimforge/rapier3d-simd-compat';
import type { BlockColliderShape } from './block-collider-shape';
import type { CylinderColliderShape } from './cylinder-collider-shape';
import type { SphereColliderShape } from './sphere-collider-shape';
import type { WheelCarColliderShape } from './wheel-car-collider-shape';

export type RigidColliderShape =
  | { kind: 'block'; shape: BlockColliderShape }
  | { kind: 'cylinder'; shape: CylinderColliderShape }
  | { kind: 'sphere'; shape: SphereColliderShape }
  | { kind: 'wheelCar'; shape: WheelCarColliderShape };

function blockColliderDesc(shape: BlockColliderShape): RAPIER.ColliderDesc {
  const { halfExtents, borderRadiusM, centerOffsetY } = shape;
  const colliderDesc =
    borderRadiusM > 0
      ? RAPIER.ColliderDesc.roundCuboid(
          halfExtents.x,
          halfExtents.y,
          halfExtents.z,
          borderRadiusM,
        )
      : RAPIER.ColliderDesc.cuboid(
          halfExtents.x,
          halfExtents.y,
          halfExtents.z,
        );
  colliderDesc.setTranslation(0, centerOffsetY, 0);
  return colliderDesc;
}

function cylinderColliderDesc(shape: CylinderColliderShape): RAPIER.ColliderDesc {
  const { halfHeightM, radiusM, borderRadiusM, centerOffsetY } = shape;
  const colliderDesc =
    borderRadiusM > 0
      ? RAPIER.ColliderDesc.roundCylinder(halfHeightM, radiusM, borderRadiusM)
      : RAPIER.ColliderDesc.cylinder(halfHeightM, radiusM);
  colliderDesc.setTranslation(0, centerOffsetY, 0);
  return colliderDesc;
}

function sphereColliderDesc(shape: SphereColliderShape): RAPIER.ColliderDesc {
  const colliderDesc = RAPIER.ColliderDesc.ball(shape.colliderRadiusM);
  colliderDesc.setTranslation(0, shape.centerOffsetY, 0);
  return colliderDesc;
}

const HALF_PI = Math.PI / 2;
const AXLE_Z_ROTATION = { x: 0, y: 0, z: Math.sin(HALF_PI / 2), w: Math.cos(HALF_PI / 2) };

function wheelCarColliderDesc(shape: WheelCarColliderShape): RAPIER.ColliderDesc {
  const colliderDesc = RAPIER.ColliderDesc.cylinder(shape.halfHeightM, shape.radiusM);
  colliderDesc.setTranslation(0, shape.centerOffsetY, 0);
  colliderDesc.setRotation(AXLE_Z_ROTATION);
  return colliderDesc;
}

export function rigidColliderToRapierDesc(rigid: RigidColliderShape): RAPIER.ColliderDesc {
  switch (rigid.kind) {
    case 'block':
      return blockColliderDesc(rigid.shape);
    case 'cylinder':
      return cylinderColliderDesc(rigid.shape);
    case 'sphere':
      return sphereColliderDesc(rigid.shape);
    case 'wheelCar':
      return wheelCarColliderDesc(rigid.shape);
  }
}
