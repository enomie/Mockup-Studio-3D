import * as store from './app-store-internals';

import { clampGravityScale } from '@/scene/physics-settings';

export function setGravityScale(gravityScale: number): void {
  store.patchPhysics({ gravityScale: clampGravityScale(gravityScale) });
}

export function startPhysicsRigidTest(): void {
  store.sceneApi?.startPhysicsRigidTest();
  store.syncEngineStateFromEngine();
}

export function stopPhysicsRigidTest(): void {
  store.sceneApi?.stopPhysicsRigidTest();
  store.syncEngineStateFromEngine();
}

export function startWorldPhysics(): void {
  store.sceneApi?.startWorldPhysics();
  store.syncEngineStateFromEngine();
}

export function toggleWorldPhysicsPause(): void {
  store.sceneApi?.toggleWorldPhysicsPause();
  store.syncEngineStateFromEngine();
}

export function resetWorldPhysics(): void {
  store.sceneApi?.resetWorldPhysics();
  store.syncEngineStateFromEngine();
}
