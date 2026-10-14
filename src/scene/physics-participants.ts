/**
 * Entity-level helpers for world physics (status counts, future UI).
 * Session phase (idle/simulating) lives in the engine — these describe asset config only.
 */
import { isFabricClothAssetKind } from './asset-fabric-cloth';
import type { AssetEntity } from './entity-types';
import { isRigidPrimitiveAssetKind } from './rigid-primitive-asset';
import { resolvePhysicsBodyMode } from './physics-rigid-body';

/** Fabric cloth — spawns a Rapier SoftBody cloth when world physics starts. */
export function isFabricClothWorldPhysicsEntity(entity: AssetEntity): boolean {
  return isFabricClothAssetKind(entity.assetKind);
}

/** Rigid primitive in fixed mode — Rapier fixed collider in idle and during world session. */
export function isRigidPrimitiveWithFixedCollider(entity: AssetEntity): boolean {
  return (
    isRigidPrimitiveAssetKind(entity.assetKind) &&
    resolvePhysicsBodyMode(entity) === 'fixed'
  );
}

/** Rigid primitive in dynamic mode — Rapier dynamic body only after world physics start. */
export function isRigidPrimitiveDynamicEntity(entity: AssetEntity): boolean {
  return (
    isRigidPrimitiveAssetKind(entity.assetKind) &&
    resolvePhysicsBodyMode(entity) === 'dynamic'
  );
}

/** Entities that receive a dynamic Rapier body when the user presses Start. */
export function spawnsDynamicBodyOnWorldStart(entity: AssetEntity): boolean {
  if (isFabricClothWorldPhysicsEntity(entity)) {return true;}
  if (isRigidPrimitiveDynamicEntity(entity)) {return true;}
  return false;
}

/** Fixed Rapier colliders present while world session is idle (obstacles). */
export function hasIdleFixedPhysicsCollider(entity: AssetEntity): boolean {
  return isRigidPrimitiveWithFixedCollider(entity);
}

/** Any asset kind that participates in world physics in some form. */
export function isWorldPhysicsSceneEntity(entity: AssetEntity): boolean {
  return (
    isFabricClothWorldPhysicsEntity(entity) ||
    isRigidPrimitiveWithFixedCollider(entity) ||
    isRigidPrimitiveDynamicEntity(entity)
  );
}

export function countSpawnsDynamicBodyOnWorldStart(
  entities: readonly AssetEntity[],
): number {
  let count = 0;
  for (const entity of entities) {
    if (spawnsDynamicBodyOnWorldStart(entity)) {count += 1;}
  }
  return count;
}

export function countIdleFixedPhysicsColliders(entities: readonly AssetEntity[]): number {
  let count = 0;
  for (const entity of entities) {
    if (hasIdleFixedPhysicsCollider(entity)) {count += 1;}
  }
  return count;
}
