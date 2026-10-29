import { describe, expect, it, beforeEach } from 'vitest';
import * as store from './app-store-internals';
import { removeUserBakedAsset } from './app-store-user-baked-assets';
import { defaultFabricClothParams } from '@/scene/asset-fabric-cloth';
import type { UserBakedAsset } from '@/scene/user-baked-asset';

function sampleBakedAsset(id: string): UserBakedAsset {
  return {
    id,
    source: 'user',
    name: 'Test baked',
    bakedFromKind: 'fabric-cloth',
    placementKind: 'fabric-cloth-baked',
    defaults: {
      screenImageId: null,
      materials: {},
      fabricClothParams: defaultFabricClothParams(),
    },
    mesh: {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      uvs: [0, 0, 1, 0, 0, 1, 1, 1],
      restPlaneXY: [0, 0, 1, 0, 0, 1, 1, 1],
      segmentsW: 1,
      segmentsH: 1,
      planeWidthM: 0.45,
      planeHeightM: 0.45,
    },
  };
}

describe('app-store-user-baked-assets', () => {
  beforeEach(() => {
    store.setAppState({
      ...store.state,
      userBakedAssets: [sampleBakedAsset('user-baked-1')],
      entities: [],
    });
  });

  it('removeUserBakedAsset succeeds when unused', () => {
    expect(removeUserBakedAsset('user-baked-1')).toBe(true);
    expect(store.state.userBakedAssets).toHaveLength(0);
  });

  it('removeUserBakedAsset blocks when referenced by entity', () => {
    store.setAppState({
      ...store.state,
      entities: [
        {
          id: 'e1',
          type: 'asset',
          name: 'Inst',
          assetKind: 'fabric-cloth-baked',
          screenImageId: null,
          sizeScale: 1,
          visible: true,
          transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
          userBakedAssetId: 'user-baked-1',
        },
      ],
    });
    expect(removeUserBakedAsset('user-baked-1')).toBe(false);
    expect(store.state.userBakedAssets).toHaveLength(1);
  });
});
