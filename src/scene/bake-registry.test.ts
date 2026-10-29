import { describe, expect, it } from 'vitest';
import { canBakeEntity } from './bake-registry';
import type { AssetEntity } from './entity-types';

function clothEntity(): AssetEntity {
  return {
    id: 'e1',
    type: 'asset',
    name: 'Cloth',
    assetKind: 'fabric-cloth',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
  };
}

describe('canBakeEntity', () => {
  it('allows fabric-cloth when paused with session', () => {
    expect(
      canBakeEntity(clothEntity(), 'paused', { hasFabricClothSession: true }),
    ).toBe(true);
  });

  it('rejects when simulating or no session', () => {
    expect(
      canBakeEntity(clothEntity(), 'simulating', { hasFabricClothSession: true }),
    ).toBe(false);
    expect(
      canBakeEntity(clothEntity(), 'paused', { hasFabricClothSession: false }),
    ).toBe(false);
  });
});
