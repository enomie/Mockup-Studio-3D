import { describe, expect, it, vi } from 'vitest';
import { WorldPhysicsSessionController } from './world-physics-session';
import type { EntityRegistry } from './entity-registry';
import type { RigidPrimitivePhysicsColliders } from './rigid-primitive-physics-colliders';
import type { WorldPhysicsDynamicParticipant } from './world-physics-dynamic-participant';
import type { AssetEntity } from '@/scene/entity-types';

function makeEntity(id: string, y: number): AssetEntity {
  return {
    id,
    type: 'asset',
    name: id,
    assetKind: 'block',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    transform: {
      position: { x: 0, y, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  };
}

function mockRegistry(entities: AssetEntity[]): EntityRegistry {
  const map = new Map(entities.map((e) => [e.id, e]));
  return {
    getEntities: () => entities,
    getRuntime: (id: string) => {
      const entity = map.get(id);
      if (!entity) {return undefined;}
      return { entity, object: { position: { ...entity.transform.position } } } as never;
    },
    updateTransform: vi.fn((id: string, partial: { position?: { x: number; y: number; z: number } }) => {
      const entity = map.get(id);
      if (!entity || !partial.position) {return;}
      entity.transform.position = { ...partial.position };
    }),
  } as unknown as EntityRegistry;
}

function mockParticipant(): WorldPhysicsDynamicParticipant {
  return {
    spawnSessionDynamics: vi.fn(),
    clearSessionDynamics: vi.fn(),
    setAllSleeping: vi.fn(),
    syncEntityTransformsFromPhysics: vi.fn(),
  };
}

describe('WorldPhysicsSessionController', () => {
  it('transitions start → pause toggle → reset', () => {
    const registry = mockRegistry([makeEntity('a', 1)]);
    const rigidPrimitivePhysics = {
      syncPoseFromRuntime: vi.fn(),
    } as unknown as RigidPrimitivePhysicsColliders;
    const blockParticipant = mockParticipant();
    const fabricParticipant = mockParticipant();
    const session = new WorldPhysicsSessionController({
      registry,
      rigidPrimitivePhysics,
      dynamicParticipants: [blockParticipant, fabricParticipant],
    });

    expect(session.getPhase()).toBe('idle');
    session.start();
    expect(session.getPhase()).toBe('simulating');
    expect(session.hasSnapshot()).toBe(true);
    expect(blockParticipant.spawnSessionDynamics).toHaveBeenCalled();
    expect(fabricParticipant.spawnSessionDynamics).toHaveBeenCalled();

    session.togglePause();
    expect(session.getPhase()).toBe('paused');
    expect(blockParticipant.setAllSleeping).toHaveBeenCalledWith(true);
    expect(fabricParticipant.setAllSleeping).toHaveBeenCalledWith(true);
    session.togglePause();
    expect(blockParticipant.setAllSleeping).toHaveBeenCalledWith(false);
    expect(fabricParticipant.setAllSleeping).toHaveBeenCalledWith(false);
    expect(session.getPhase()).toBe('simulating');

    registry.updateTransform('a', { position: { x: 0, y: 9, z: 0 } });
    session.reset();
    expect(blockParticipant.clearSessionDynamics).toHaveBeenCalled();
    expect(fabricParticipant.clearSessionDynamics).toHaveBeenCalled();
    expect(session.getPhase()).toBe('idle');
    expect(registry.getEntities()[0].transform.position.y).toBe(1);
  });
});
