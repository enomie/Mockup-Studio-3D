import { Object3D } from 'three/webgpu';
import { describe, expect, it, vi } from 'vitest';
import { defaultBlockParams } from '@/scene/asset-block';
import type { AssetEntity } from '@/scene/entity-types';
import { rigidPhysicsBodyId } from '@/physics/rigid-body-id';
import type { PhysicsWorld } from '@/physics/physics-world';
import type { EntityRegistry } from './entity-registry';
import { RigidPrimitivePhysicsColliders } from './rigid-primitive-physics-colliders';

function makeBlockEntity(id: string, mode: 'fixed' | 'dynamic'): AssetEntity {
  return {
    id,
    type: 'asset',
    name: id,
    assetKind: 'block',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    physicsBodyMode: mode,
    physicsDensityKgPerM3: 1000,
    blockParams: defaultBlockParams(),
    transform: {
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  };
}

function mockRegistry(entity: AssetEntity): EntityRegistry {
  const object = new Object3D();
  object.position.set(
    entity.transform.position.x,
    entity.transform.position.y,
    entity.transform.position.z,
  );
  object.quaternion.setFromEuler({ x: 0, y: 0, z: 0, order: 'XYZ' } as never);

  return {
    getEntities: () => [entity],
    getRuntime: (id: string) =>
      id === entity.id ? { entity, object } : undefined,
    updateTransform: vi.fn(),
  } as unknown as EntityRegistry;
}

describe('RigidPrimitivePhysicsColliders (block)', () => {
  const bodyId = (entityId: string) => rigidPhysicsBodyId('block', entityId);

  it('creates fixed collider for fixed mode when idle', () => {
    const entity = makeBlockEntity('b1', 'fixed');
    const registry = mockRegistry(entity);
    const createFixed = vi.fn();
    const physics = {
      createFixedRigidCollider: createFixed,
      createDynamicRigidCollider: vi.fn(),
      removeBody: vi.fn(),
      setFixedBodyPose: vi.fn(),
    } as unknown as PhysicsWorld;

    const colliders = new RigidPrimitivePhysicsColliders(physics, registry);
    colliders.reconcileEntity('b1');

    expect(createFixed).toHaveBeenCalledTimes(1);
    expect(physics.createDynamicRigidCollider).not.toHaveBeenCalled();
  });

  it('skips Rapier body for dynamic mode while session is idle', () => {
    const entity = makeBlockEntity('b2', 'dynamic');
    const registry = mockRegistry(entity);
    const physics = {
      createFixedRigidCollider: vi.fn(),
      createDynamicRigidCollider: vi.fn(),
      removeBody: vi.fn(),
      setFixedBodyPose: vi.fn(),
    } as unknown as PhysicsWorld;

    const colliders = new RigidPrimitivePhysicsColliders(physics, registry);
    colliders.reconcileEntity('b2');

    expect(physics.createFixedRigidCollider).not.toHaveBeenCalled();
    expect(physics.createDynamicRigidCollider).not.toHaveBeenCalled();
  });

  it('spawns dynamic body after spawnSessionDynamics', () => {
    const entity = makeBlockEntity('b3', 'dynamic');
    const registry = mockRegistry(entity);
    const body = { sleep: vi.fn(), wakeUp: vi.fn(), getTransform: vi.fn() };
    const createDynamic = vi.fn(() => body);
    const physics = {
      createFixedRigidCollider: vi.fn(),
      createDynamicRigidCollider: createDynamic,
      removeBody: vi.fn(),
      setFixedBodyPose: vi.fn(),
    } as unknown as PhysicsWorld;

    const colliders = new RigidPrimitivePhysicsColliders(physics, registry);
    colliders.spawnSessionDynamics();

    expect(createDynamic).toHaveBeenCalledTimes(1);
  });

  it('reconcile switches from fixed to dynamic and clears fixed collider', () => {
    const entity = makeBlockEntity('b4', 'fixed');
    const registry = mockRegistry(entity);
    const physics = {
      createFixedRigidCollider: vi.fn(),
      createDynamicRigidCollider: vi.fn(),
      removeBody: vi.fn(),
      setFixedBodyPose: vi.fn(),
    } as unknown as PhysicsWorld;

    const colliders = new RigidPrimitivePhysicsColliders(physics, registry);
    colliders.reconcileEntity('b4');
    entity.physicsBodyMode = 'dynamic';
    colliders.reconcileEntity('b4');

    expect(physics.removeBody).toHaveBeenCalledWith(bodyId('b4'));
    expect(physics.createDynamicRigidCollider).not.toHaveBeenCalled();
  });

  it('rebuilds dynamic body when session is active', () => {
    const entity = makeBlockEntity('b5', 'dynamic');
    const registry = mockRegistry(entity);
    const body = { sleep: vi.fn(), wakeUp: vi.fn(), getTransform: vi.fn() };
    const createDynamic = vi.fn(() => body);
    const physics = {
      createFixedRigidCollider: vi.fn(),
      createDynamicRigidCollider: createDynamic,
      removeBody: vi.fn(),
      setFixedBodyPose: vi.fn(),
    } as unknown as PhysicsWorld;

    const colliders = new RigidPrimitivePhysicsColliders(physics, registry);
    colliders.spawnSessionDynamics();
    colliders.reconcileEntity('b5');

    expect(createDynamic).toHaveBeenCalledTimes(2);
  });

  it('clears existing dynamic bindings before respawn on second start', () => {
    const entity = makeBlockEntity('b6', 'dynamic');
    const registry = mockRegistry(entity);
    const body = { sleep: vi.fn(), wakeUp: vi.fn(), getTransform: vi.fn() };
    const createDynamic = vi.fn(() => body);
    const removeBody = vi.fn();
    const physics = {
      createFixedRigidCollider: vi.fn(),
      createDynamicRigidCollider: createDynamic,
      removeBody,
      setFixedBodyPose: vi.fn(),
    } as unknown as PhysicsWorld;

    const colliders = new RigidPrimitivePhysicsColliders(physics, registry);
    colliders.spawnSessionDynamics();
    colliders.spawnSessionDynamics();

    expect(createDynamic).toHaveBeenCalledTimes(2);
    expect(removeBody).toHaveBeenCalledWith(bodyId('b6'));
  });
});
