import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SceneApi } from '@/scene/scene-api';
import { setKindParams, setWallpaperPattern } from './app-store-asset-params';
import { setSceneApiRef } from './app-store-internals';

describe('app-store-asset-params', () => {
  afterEach(() => { setSceneApiRef(null); });

  it('setKindParams forwards to the scene API', () => {
    const setKindParamsApi = vi.fn();
    setSceneApiRef({ setKindParams: setKindParamsApi } as unknown as SceneApi);

    setKindParams('block', 'e1', { widthM: 2 });

    expect(setKindParamsApi).toHaveBeenCalledWith('block', 'e1', { widthM: 2 });
  });

  it('setWallpaperPattern forwards to the scene API', () => {
    const setWallpaperPatternApi = vi.fn();
    setSceneApiRef({ setWallpaperPattern: setWallpaperPatternApi } as unknown as SceneApi);

    setWallpaperPattern('w1', { stripWidthM: 0.4 });

    expect(setWallpaperPatternApi).toHaveBeenCalledWith('w1', { stripWidthM: 0.4 });
  });

  it('does nothing without a scene API', () => {
    expect(() => { setKindParams('block', 'e1', { widthM: 2 }); }).not.toThrow();
  });
});
