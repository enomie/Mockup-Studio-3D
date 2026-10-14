import { isBlockAssetKind } from '@/scene/asset-block';
import { isCylinderAssetKind } from '@/scene/asset-cylinder';
import { isSphereAssetKind } from '@/scene/asset-sphere';
import type { AssetEntity } from '@/scene/entity-types';
import {
  isRigidPrimitiveAssetKind,
  type RigidPrimitiveAssetKind,
} from '@/scene/rigid-primitive-asset';
import {
  resolvePhysicsBodyMode,
  rigidMassKgFromEntity,
} from '@/scene/physics-rigid-body';
import { rigidPhysicsBodyId } from '@/physics/rigid-body-id';
import { rigidColliderShapeFromEntity } from '@/physics/rigid-collider-from-entity';
import type { PhysicsWorld } from '@/physics/physics-world';
import {
  poseFromObject3D,
  setPhysicsBindingsSleeping,
  syncPhysicsBindingsToRegistry,
  type PhysicsBinding,
} from './physics-sync';
import type { EntityRegistry } from './entity-registry';

function isRigidPrimitiveEntity(entity: AssetEntity): boolean {
  return isRigidPrimitiveAssetKind(entity.assetKind);
}

function bodyIdForEntity(entity: AssetEntity): string | null {
  if (!isRigidPrimitiveAssetKind(entity.assetKind)) {return null;}
  return rigidPhysicsBodyId(entity.assetKind, entity.id);
}

/** Rapier colliders for block, cylinder, and sphere — fixed or session dynamic. */
export class RigidPrimitivePhysicsColliders {
  private readonly trackedFixedIds = new Set<string>();
  private readonly dynamicBindings = new Map<string, PhysicsBinding>();
  private worldSessionActive = false;

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly registry: EntityRegistry,
  ) {}

  refreshOne(entityId: string): void {
    this.reconcileEntity(entityId);
  }

  reconcileEntity(entityId: string): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isRigidPrimitiveEntity(runtime.entity)) {return;}

    const mode = resolvePhysicsBodyMode(runtime.entity);
    if (mode === 'fixed') {
      this.removeDynamicOne(entityId);
      this.upsertFixed(entityId);
      return;
    }

    this.removeFixed(entityId);
    if (this.worldSessionActive) {
      this.spawnDynamicOne(entityId);
    } else {
      this.removeDynamicOne(entityId);
    }
  }

  syncPoseFromRuntime(entityId: string): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isRigidPrimitiveEntity(runtime.entity)) {return;}
    const bodyId = bodyIdForEntity(runtime.entity);
    if (!bodyId || !this.trackedFixedIds.has(entityId)) {return;}

    const pose = poseFromObject3D(runtime.object);
    this.physics.setFixedBodyPose(bodyId, pose.position, pose.rotation);
  }

  spawnSessionDynamics(): void {
    for (const entityId of this.dynamicBindings.keys()) {
      const runtime = this.registry.getRuntime(entityId);
      const bodyId = runtime ? bodyIdForEntity(runtime.entity) : null;
      if (bodyId) {this.physics.removeBody(bodyId);}
    }
    this.dynamicBindings.clear();
    this.worldSessionActive = true;
    for (const entity of this.registry.getEntities()) {
      if (!isRigidPrimitiveEntity(entity)) {continue;}
      if (resolvePhysicsBodyMode(entity) !== 'dynamic') {continue;}
      this.removeFixed(entity.id);
      this.spawnDynamicOne(entity.id);
    }
  }

  clearSessionDynamics(): void {
    for (const entityId of this.dynamicBindings.keys()) {
      const runtime = this.registry.getRuntime(entityId);
      const bodyId = runtime ? bodyIdForEntity(runtime.entity) : null;
      if (bodyId) {this.physics.removeBody(bodyId);}
    }
    this.dynamicBindings.clear();
    this.worldSessionActive = false;
  }

  setAllSleeping(sleeping: boolean): void {
    setPhysicsBindingsSleeping(this.dynamicBindings.values(), sleeping);
  }

  syncEntityTransformsFromPhysics(): void {
    syncPhysicsBindingsToRegistry(this.dynamicBindings, this.registry);
  }

  remove(entityId: string): void {
    this.removeFixed(entityId);
    this.removeDynamicOne(entityId);
  }

  dispose(): void {
    for (const entityId of [...this.trackedFixedIds]) {
      this.removeFixed(entityId);
    }
    for (const entityId of [...this.dynamicBindings.keys()]) {
      this.removeDynamicOne(entityId);
    }
    this.worldSessionActive = false;
  }

  private upsertFixed(entityId: string): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isRigidPrimitiveEntity(runtime.entity)) {return;}

    const rigid = rigidColliderShapeFromEntity(runtime.entity);
    const bodyId = bodyIdForEntity(runtime.entity);
    if (!rigid || !bodyId) {return;}

    const pose = poseFromObject3D(runtime.object);
    this.physics.createFixedRigidCollider(bodyId, rigid, pose);
    this.trackedFixedIds.add(entityId);
  }

  private removeFixed(entityId: string): void {
    if (!this.trackedFixedIds.has(entityId)) {return;}
    const runtime = this.registry.getRuntime(entityId);
    const bodyId = runtime ? bodyIdForEntity(runtime.entity) : null;
    if (bodyId) {this.physics.removeBody(bodyId);}
    this.trackedFixedIds.delete(entityId);
  }

  private spawnDynamicOne(entityId: string): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isRigidPrimitiveEntity(runtime.entity)) {return;}

    this.removeDynamicOne(entityId);

    const rigid = rigidColliderShapeFromEntity(runtime.entity);
    const bodyId = bodyIdForEntity(runtime.entity);
    if (!rigid || !bodyId) {return;}

    const pose = poseFromObject3D(runtime.object);
    const massKg = rigidMassKgFromEntity(runtime.entity);

    const body = this.physics.createDynamicRigidCollider(bodyId, rigid, pose, {
      massKg,
    });
    this.dynamicBindings.set(entityId, { body, object: runtime.object });
  }

  private removeDynamicOne(entityId: string): void {
    if (!this.dynamicBindings.has(entityId)) {return;}
    const runtime = this.registry.getRuntime(entityId);
    const bodyId = runtime ? bodyIdForEntity(runtime.entity) : null;
    if (bodyId) {this.physics.removeBody(bodyId);}
    this.dynamicBindings.delete(entityId);
  }
}

export function isRigidColliderAssetKind(
  kind: AssetEntity['assetKind'],
): kind is RigidPrimitiveAssetKind {
  return (
    isBlockAssetKind(kind) || isCylinderAssetKind(kind) || isSphereAssetKind(kind)
  );
}
