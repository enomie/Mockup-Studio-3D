import { Object3D } from 'three/webgpu';
import { describe, expect, it, vi } from 'vitest';
import { buildSceneColliderSnapshot } from '@/physics/cloth/build-scene-collider-snapshot';
import { defaultBlockParams } from '@/scene/asset-block';
import { blockColliderShapeFromParams } from '@/physics/block-collider-shape';
import { defaultFabricClothParams } from '@/scene/asset-fabric-cloth';
import type { AssetEntity } from '@/scene/entity-types';
import type { EntityRegistry } from '@/engine/entity-registry';

function makeBlockEntity(id: string, mode: 'fixed' | 'dynamic', visible = true): AssetEntity {
  return {
    id,
    type: 'asset',
    name: id,
    assetKind: 'block',
    screenImageId: null,
    sizeScale: 1,
    visible,
    physicsBodyMode: mode,
    physicsDensityKgPerM3: 1000,
    blockParams: defaultBlockParams(),
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  };
}

function makeFabricEntity(id: string): AssetEntity {
  return {
    id,
    type: 'asset',
    name: id,
    assetKind: 'fabric-cloth',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    physicsBodyMode: 'dynamic',
    physicsDensityKgPerM3: 1000,
    fabricClothParams: defaultFabricClothParams(),
    transform: {
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  };
}

function mockRegistry(entities: AssetEntity[]): EntityRegistry {
  const objectById = new Map<string, Object3D>();
  for (const entity of entities) {
    const object = new Object3D();
    object.position.set(
      entity.transform.position.x,
      entity.transform.position.y,
      entity.transform.position.z,
    );
    objectById.set(entity.id, object);
  }

  return {
    getEntities: () => entities,
    getRuntime: (id: string) => {
      const entity = entities.find((e) => e.id === id);
      const object = objectById.get(id);
      if (!entity || !object) {return undefined;}
      return { entity, object };
    },
    updateTransform: vi.fn(),
  } as unknown as EntityRegistry;
}

describe('buildSceneColliderSnapshot', () => {
  it('includes fixed block as roundedBox', () => {
    const entity = makeBlockEntity('b1', 'fixed');
    const snapshot = buildSceneColliderSnapshot(mockRegistry([entity]), {
      worldSessionActive: false,
    });
    expect(snapshot.colliders).toHaveLength(1);
    const collider = snapshot.colliders[0];
    expect(collider?.kind).toBe('roundedBox');
    if (collider?.kind !== 'roundedBox') {return;}
    const shape = blockColliderShapeFromParams(defaultBlockParams());
    expect(collider.halfExtents.x).toBeCloseTo(shape.halfExtents.x, 6);
    expect(collider.cornerRadius).toBeCloseTo(shape.borderRadiusM, 6);
  });

  it('excludes dynamic block when world session is idle', () => {
    const entity = makeBlockEntity('b2', 'dynamic');
    const snapshot = buildSceneColliderSnapshot(mockRegistry([entity]), {
      worldSessionActive: false,
    });
    expect(snapshot.colliders).toHaveLength(0);
  });

  it('includes dynamic block when world session is active', () => {
    const entity = makeBlockEntity('b3', 'dynamic');
    const snapshot = buildSceneColliderSnapshot(mockRegistry([entity]), {
      worldSessionActive: true,
    });
    expect(snapshot.colliders).toHaveLength(1);
  });

  it('never lists fabric cloth entities', () => {
    const block = makeBlockEntity('b4', 'fixed');
    const fabric = makeFabricEntity('f1');
    const snapshot = buildSceneColliderSnapshot(mockRegistry([block, fabric]), {
      worldSessionActive: true,
    });
    expect(snapshot.colliders).toHaveLength(1);
    expect(snapshot.colliders[0]?.kind).toBe('roundedBox');
  });

  it('skips invisible rigid primitives', () => {
    const entity = makeBlockEntity('b5', 'fixed', false);
    const snapshot = buildSceneColliderSnapshot(mockRegistry([entity]), {
      worldSessionActive: false,
    });
    expect(snapshot.colliders).toHaveLength(0);
  });
});
