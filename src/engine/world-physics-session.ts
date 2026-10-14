import { resolvePhysicsBodyMode } from '@/scene/physics-rigid-body';
import { isRigidPrimitiveAssetKind } from '@/scene/rigid-primitive-asset';
import { cloneTransform, type EntityTransform } from '@/scene/entity-types';
import type { WorldPhysicsPhase } from '@/scene/physics-settings';
import type { RigidPrimitivePhysicsColliders } from './rigid-primitive-physics-colliders';
import type { WorldPhysicsDynamicParticipant } from './world-physics-dynamic-participant';
import type { EntityRegistry } from './entity-registry';

export type WorldPhysicsTransformSnapshot = Map<string, EntityTransform>;

export interface WorldPhysicsSessionDeps {
  registry: EntityRegistry;
  rigidPrimitivePhysics: RigidPrimitivePhysicsColliders;
  dynamicParticipants: readonly WorldPhysicsDynamicParticipant[];
}

export class WorldPhysicsSessionController {
  private phase: WorldPhysicsPhase = 'idle';
  private snapshot: WorldPhysicsTransformSnapshot | null = null;

  constructor(private readonly deps: WorldPhysicsSessionDeps) {}

  getPhase(): WorldPhysicsPhase {
    return this.phase;
  }

  hasSnapshot(): boolean {
    return this.snapshot !== null;
  }

  start(): void {
    this.captureSnapshot();
    for (const participant of this.deps.dynamicParticipants) {
      participant.spawnSessionDynamics();
    }
    this.phase = 'simulating';
  }

  togglePause(): void {
    if (this.phase === 'simulating') {
      for (const participant of this.deps.dynamicParticipants) {
        participant.setAllSleeping(true);
      }
      this.phase = 'paused';
      return;
    }
    if (this.phase === 'paused') {
      for (const participant of this.deps.dynamicParticipants) {
        participant.setAllSleeping(false);
      }
      this.phase = 'simulating';
    }
  }

  reset(): void {
    if (!this.snapshot) {return;}
    for (const participant of this.deps.dynamicParticipants) {
      participant.clearSessionDynamics();
    }
    this.restoreSnapshot(this.snapshot);
    this.phase = 'idle';
  }

  tick(_deltaSeconds: number): void {
    if (this.phase !== 'simulating') {return;}
    for (const participant of this.deps.dynamicParticipants) {
      participant.syncEntityTransformsFromPhysics();
    }
  }

  private captureSnapshot(): void {
    const next = new Map<string, EntityTransform>();
    for (const entity of this.deps.registry.getEntities()) {
      next.set(entity.id, cloneTransform(entity.transform));
    }
    this.snapshot = next;
  }

  private restoreSnapshot(snap: WorldPhysicsTransformSnapshot): void {
    for (const [entityId, transform] of snap) {
      if (!this.deps.registry.getRuntime(entityId)) {continue;}
      this.deps.registry.updateTransform(entityId, {
        position: { ...transform.position },
        rotation: { ...transform.rotation },
      });
      const runtime = this.deps.registry.getRuntime(entityId);
      if (
        runtime &&
        isRigidPrimitiveAssetKind(runtime.entity.assetKind) &&
        resolvePhysicsBodyMode(runtime.entity) === 'fixed'
      ) {
        this.deps.rigidPrimitivePhysics.syncPoseFromRuntime(entityId);
      }
    }
  }
}
