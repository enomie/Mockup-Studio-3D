import {
  colliderWorldMatricesFromObject,
  worldPointFromObjectLocal,
} from '@/physics/cloth/collider-world-matrix';
import type { SceneCollider, SceneColliderSnapshot } from '@/physics/cloth/scene-colliders';
import { rigidColliderShapeFromEntity } from '@/physics/rigid-collider-from-entity';
import type { EntityRegistry } from '@/engine/entity-registry';
import {
  isFabricClothAssetKind,
  isFabricClothBakedAssetKind,
} from '@/scene/asset-fabric-cloth';
import { resolvePhysicsBodyMode } from '@/scene/physics-rigid-body';
import { isRigidPrimitiveAssetKind } from '@/scene/rigid-primitive-asset';
import { WHEEL_COLLIDER_AXLE_QUATERNION } from '@/physics/wheel-collider-frame';

export interface BuildSceneColliderSnapshotOptions {
  /** When true, include dynamic rigid bodies (world physics simulating). */
  worldSessionActive: boolean;
}

function entityContributesToSnapshot(
  worldSessionActive: boolean,
  physicsBodyMode: ReturnType<typeof resolvePhysicsBodyMode>,
): boolean {
  if (physicsBodyMode === 'fixed') {
    return true;
  }
  return worldSessionActive;
}

export function buildSceneColliderSnapshot(
  registry: EntityRegistry,
  options: BuildSceneColliderSnapshotOptions,
): SceneColliderSnapshot {
  const colliders: SceneCollider[] = [];

  for (const entity of registry.getEntities()) {
    if (!entity.visible) {continue;}
    if (isFabricClothAssetKind(entity.assetKind) || isFabricClothBakedAssetKind(entity.assetKind)) {
      continue;
    }
    if (!isRigidPrimitiveAssetKind(entity.assetKind)) {continue;}

    const mode = resolvePhysicsBodyMode(entity);
    if (!entityContributesToSnapshot(options.worldSessionActive, mode)) {continue;}

    const runtime = registry.getRuntime(entity.id);
    if (!runtime) {continue;}

    const rigid = rigidColliderShapeFromEntity(entity);
    if (!rigid) {continue;}

    const object = runtime.object;

    switch (rigid.kind) {
      case 'block': {
        const { halfExtents, borderRadiusM, centerOffsetY } = rigid.shape;
        const { matrixWorld, matrixWorldInverse } = colliderWorldMatricesFromObject(
          object,
          centerOffsetY,
        );
        colliders.push({
          kind: 'roundedBox',
          halfExtents: { ...halfExtents },
          cornerRadius: borderRadiusM,
          matrixWorld,
          matrixWorldInverse,
        });
        break;
      }
      case 'cylinder': {
        const { halfHeightM, radiusM, centerOffsetY } = rigid.shape;
        const { matrixWorld, matrixWorldInverse } = colliderWorldMatricesFromObject(
          object,
          centerOffsetY,
        );
        colliders.push({
          kind: 'cappedCylinder',
          radius: radiusM,
          halfHeight: halfHeightM,
          matrixWorld,
          matrixWorldInverse,
        });
        break;
      }
      case 'sphere': {
        const { colliderRadiusM, centerOffsetY } = rigid.shape;
        const center = worldPointFromObjectLocal(object, 0, centerOffsetY, 0);
        colliders.push({
          kind: 'sphere',
          radius: colliderRadiusM,
          centerX: center.x,
          centerY: center.y,
          centerZ: center.z,
        });
        break;
      }
      case 'wheelCar': {
        const { halfHeightM, radiusM, centerOffsetY } = rigid.shape;
        const { matrixWorld, matrixWorldInverse } = colliderWorldMatricesFromObject(
          object,
          centerOffsetY,
          WHEEL_COLLIDER_AXLE_QUATERNION,
        );
        colliders.push({
          kind: 'cappedCylinder',
          radius: radiusM,
          halfHeight: halfHeightM,
          matrixWorld,
          matrixWorldInverse,
        });
        break;
      }
    }
  }

  return { colliders };
}
