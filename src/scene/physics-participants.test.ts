import { describe, expect, it } from 'vitest';
import { defaultBlockParams } from './asset-block';
import type { AssetEntity } from './entity-types';
import {
  countIdleFixedPhysicsColliders,
  countSpawnsDynamicBodyOnWorldStart,
  hasIdleFixedPhysicsCollider,
  isFabricClothWorldPhysicsEntity,
  isRigidPrimitiveDynamicEntity,
  isRigidPrimitiveWithFixedCollider,
  spawnsDynamicBodyOnWorldStart,
} from './physics-participants';

function blockEntity(partial: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: 'b1',
    type: 'asset',
    name: 'Block',
    assetKind: 'block',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    blockParams: defaultBlockParams(),
    ...partial,
  };
}

function fabricEntity(): AssetEntity {
  return {
    id: 'f1',
    type: 'asset',
    name: 'Cloth',
    assetKind: 'fabric-cloth',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  };
}

describe('physics-participants', () => {
  it('defaults block to dynamic spawn on start, no idle fixed collider', () => {
    const entity = blockEntity();
    expect(isRigidPrimitiveDynamicEntity(entity)).toBe(true);
    expect(isRigidPrimitiveWithFixedCollider(entity)).toBe(false);
    expect(hasIdleFixedPhysicsCollider(entity)).toBe(false);
    expect(spawnsDynamicBodyOnWorldStart(entity)).toBe(true);
  });

  it('treats fixed block as idle collider, not dynamic spawn', () => {
    const entity = blockEntity({ physicsBodyMode: 'fixed' });
    expect(isRigidPrimitiveWithFixedCollider(entity)).toBe(true);
    expect(isRigidPrimitiveDynamicEntity(entity)).toBe(false);
    expect(hasIdleFixedPhysicsCollider(entity)).toBe(true);
    expect(spawnsDynamicBodyOnWorldStart(entity)).toBe(false);
  });

  it('fabric spawns on start, no fixed idle collider', () => {
    const entity = fabricEntity();
    expect(isFabricClothWorldPhysicsEntity(entity)).toBe(true);
    expect(spawnsDynamicBodyOnWorldStart(entity)).toBe(true);
    expect(hasIdleFixedPhysicsCollider(entity)).toBe(false);
  });

  it('counts dynamic spawn and fixed collider candidates', () => {
    const entities = [
      blockEntity({ id: 'b-dyn' }),
      blockEntity({ id: 'b-fix', physicsBodyMode: 'fixed' }),
      fabricEntity(),
    ];
    expect(countSpawnsDynamicBodyOnWorldStart(entities)).toBe(2);
    expect(countIdleFixedPhysicsColliders(entities)).toBe(1);
  });
});
