import { Group, Scene } from 'three/webgpu';
import { describe, expect, it, vi } from 'vitest';
import { defaultTransform } from '@/scene/entity-types';
import { AssetSystem } from './asset-system';
import { EntityRegistry } from './entity-registry';
import { ImageTextureLoader } from './image-texture-loader';

/**
 * The UI store mirrors entities from the engine instead of patching its own copy,
 * so controlled inputs rely on the registry being patched and emitting synchronously,
 * before any async rebuild starts.
 */
describe('AssetSystem param setters patch the registry synchronously', () => {
  function setup(kind: 'block' | 'wall' | 'book-softcover') {
    const registry = new EntityRegistry();
    const assets = new AssetSystem(new Scene(), registry, new ImageTextureLoader());
    registry.addEntity('e1', kind, new Group(), defaultTransform());
    const listener = vi.fn();
    registry.subscribeEntities(listener);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    return { registry, assets, listener };
  }

  it('setKindParams', () => {
    const { registry, assets, listener } = setup('block');
    void assets.setKindParams('block', 'e1', { widthM: 0.42 });
    expect(listener).toHaveBeenCalled();
    expect(registry.getRuntime('e1')?.entity.blockParams?.widthM).toBe(0.42);
  });

  it('setPhysicsDensityKgPerM3', () => {
    const { registry, assets, listener } = setup('block');
    assets.setPhysicsDensityKgPerM3('e1', 2500);
    expect(listener).toHaveBeenCalled();
    expect(registry.getRuntime('e1')?.entity.physicsDensityKgPerM3).toBe(2500);
  });

  it('setWallpaperPattern', () => {
    const { registry, assets, listener } = setup('wall');
    void assets.setWallpaperPattern('e1', { stripWidthM: 0.6 });
    expect(listener).toHaveBeenCalled();
    expect(registry.getRuntime('e1')?.entity.wallpaperPattern?.stripWidthM).toBe(0.6);
  });

  it('setBookSpineImageId', () => {
    const { registry, assets, listener } = setup('book-softcover');
    void assets.setBookSpineImageId('e1', 'img-1');
    expect(listener).toHaveBeenCalled();
    expect(registry.getRuntime('e1')?.entity.bookSpineImageId).toBe('img-1');
  });
});
