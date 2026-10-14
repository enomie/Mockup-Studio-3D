import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { STARTER_IMAGES, type ImageAsset } from '@/data/image-assets';
import {
  DEFAULT_SIZE_SCALE,
  defaultTransform,
  type AssetEntity,
} from '@/scene/entity-types';
import type { SceneApi } from '@/scene/scene-api';
import {
  getAppState,
  setAppState,
  setSceneApiRef,
  state,
} from './app-store-internals';
import {
  removeImage,
  resetImagesForTests,
  selectImage,
} from './app-store-images';

function pictureEntity(id: string, screenImageId: string | null): AssetEntity {
  return {
    id,
    type: 'asset',
    name: 'picture',
    assetKind: 'picture',
    screenImageId,
    sizeScale: DEFAULT_SIZE_SCALE,
    visible: true,
    transform: defaultTransform(),
  };
}

const userImage: ImageAsset = {
  id: 'user-test-1',
  name: 'upload.png',
  url: 'blob:test',
  width: 100,
  height: 100,
  orientation: 'square',
  source: 'user',
  objectUrl: 'blob:test',
};

describe('app-store-images', () => {
  beforeEach(() => {
    setSceneApiRef(null);
    resetImagesForTests();
  });

  afterEach(() => {
    setSceneApiRef(null);
    resetImagesForTests();
  });

  it('removeImage ignores starter images', () => {
    const starterId = STARTER_IMAGES[0].id;
    const countBefore = getAppState().images.length;

    removeImage(starterId);

    expect(getAppState().images).toHaveLength(countBefore);
    expect(getAppState().images.some((img) => img.id === starterId)).toBe(true);
  });

  it('removeImage drops user image and clears selection', () => {
    setAppState({
      ...state,
      images: [...STARTER_IMAGES, userImage],
      selectedImageId: userImage.id,
    });

    removeImage(userImage.id);

    expect(getAppState().images.some((img) => img.id === userImage.id)).toBe(false);
    expect(getAppState().selectedImageId).toBeNull();
  });

  it('removeImage detaches scene refs and releases texture', () => {
    const setAssetImage = vi.fn();
    const releaseImageTexture = vi.fn();

    setSceneApiRef({
      getEntities: () => [pictureEntity('e1', userImage.id)],
      setAssetImage,
      setAssetFace: vi.fn(),
      releaseImageTexture,
    } as unknown as SceneApi);

    setAppState({
      ...state,
      images: [...STARTER_IMAGES, userImage],
    });

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    removeImage(userImage.id);

    expect(setAssetImage).toHaveBeenCalledWith('e1', null);
    expect(releaseImageTexture).toHaveBeenCalledWith(userImage.id);
    expect(revokeSpy).toHaveBeenCalledWith('blob:test');

    revokeSpy.mockRestore();
  });

  it('selectImage updates selectedImageId', () => {
    selectImage(STARTER_IMAGES[0].id);
    expect(getAppState().selectedImageId).toBe(STARTER_IMAGES[0].id);

    selectImage(null);
    expect(getAppState().selectedImageId).toBeNull();
  });
});
