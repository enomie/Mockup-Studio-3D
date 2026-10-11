import { describe, expect, it, vi } from 'vitest';
import { defaultBlockParams } from '@/scene/asset-block';
import { defaultWallParams, defaultWallpaperPattern } from '@/scene/asset-wall';
import {
  DEFAULT_SIZE_SCALE,
  defaultTransform,
  type AssetEntity,
} from '@/scene/entity-types';
import type { SceneApi } from '@/scene/scene-api';
import {
  setBlockParams,
  setWallpaperPattern,
  wireAppStoreAssetParams,
} from './app-store-asset-params';

function blockEntity(id: string): AssetEntity {
  return {
    id,
    type: 'asset',
    name: 'block',
    assetKind: 'block',
    screenImageId: null,
    sizeScale: DEFAULT_SIZE_SCALE,
    blockParams: defaultBlockParams(),
    visible: true,
    transform: defaultTransform(),
  };
}

function wallEntity(id: string): AssetEntity {
  return {
    id,
    type: 'asset',
    name: 'wall',
    assetKind: 'wall',
    screenImageId: null,
    sizeScale: DEFAULT_SIZE_SCALE,
    wallParams: defaultWallParams(),
    wallpaperPattern: defaultWallpaperPattern(),
    visible: true,
    transform: defaultTransform(),
  };
}

describe('app-store-asset-params', () => {
  it('setBlockParams patches local entity and forwards to scene API', () => {
    let entities = [blockEntity('e1')];
    const setBlockParamsApi = vi.fn();

    wireAppStoreAssetParams({
      getEntities: () => entities,
      patchEntity: (entityId, updater) => {
        entities = entities.map((entry) =>
          entry.id === entityId ? updater(entry) : entry,
        );
      },
      getSceneApi: () =>
        ({ setBlockParams: setBlockParamsApi }) as unknown as SceneApi,
    });

    setBlockParams('e1', { widthM: 2 });

    expect(entities[0].blockParams?.widthM).toBe(2);
    expect(setBlockParamsApi).toHaveBeenCalledWith('e1', { widthM: 2 });
  });

  it('setWallpaperPattern patches wallpaper slice and forwards to scene API', () => {
    let entities = [wallEntity('w1')];
    const setWallpaperPatternApi = vi.fn();

    wireAppStoreAssetParams({
      getEntities: () => entities,
      patchEntity: (entityId, updater) => {
        entities = entities.map((entry) =>
          entry.id === entityId ? updater(entry) : entry,
        );
      },
      getSceneApi: () =>
        ({ setWallpaperPattern: setWallpaperPatternApi }) as unknown as SceneApi,
    });

    setWallpaperPattern('w1', { stripWidthM: 0.4 });

    expect(entities[0].wallpaperPattern?.stripWidthM).toBe(0.4);
    expect(setWallpaperPatternApi).toHaveBeenCalledWith('w1', { stripWidthM: 0.4 });
  });
});
