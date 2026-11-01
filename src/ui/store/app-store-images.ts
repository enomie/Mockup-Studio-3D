import { registerImageBlob } from '@/ui/persistence/image-blob-registry';
import {
  detectOrientation,
  STARTER_IMAGES,
  type ImageAsset,
} from '@/data/image-assets';
import type { AssetFaceId } from '@/scene/entity-types';
import * as store from './app-store-internals';

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);
const ALLOWED_IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

const ASSET_FACE_IDS: AssetFaceId[] = [
  'front',
  'back',
  'left',
  'right',
  'top',
  'bottom',
];

function isAllowedImageFile(file: File): boolean {
  if (file.type && ALLOWED_IMAGE_MIME.has(file.type)) {return true;}
  return ALLOWED_IMAGE_EXT.test(file.name);
}

function loadImageMeta(file: File, objectUrl: string): Promise<ImageAsset> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        id: `user-${crypto.randomUUID()}`,
        name: file.name,
        url: objectUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        orientation: detectOrientation(img.naturalWidth, img.naturalHeight),
        source: 'user',
        objectUrl,
      });
    };
    img.onerror = () => { reject(new Error(`Failed to load ${file.name}`)); };
    img.src = objectUrl;
  });
}

function detachImageFromScene(imageId: string): void {
  const api = store.sceneApi;
  if (!api) {return;}

  for (const entity of api.getEntities()) {
    if (entity.screenImageId === imageId) {
      api.setAssetImage(entity.id, null);
    }

    if (!entity.faces) {continue;}

    for (const faceId of ASSET_FACE_IDS) {
      const face = entity.faces[faceId];
      if (face.mode === 'image' && face.imageId === imageId) {
        api.setAssetFace(entity.id, faceId, { mode: 'image', imageId: null });
      }
    }
  }
}

export function selectImage(imageId: string | null): void {
  store.setAppState({ ...store.state, selectedImageId: imageId });
  store.emit();
}

export async function addImagesFromFiles(files: FileList | File[]): Promise<void> {
  const added: ImageAsset[] = [];

  for (const file of Array.from(files)) {
    if (!isAllowedImageFile(file)) {continue;}
    const objectUrl = URL.createObjectURL(file);
    try {
      const meta = await loadImageMeta(file, objectUrl);
      registerImageBlob(meta.id, file);
      added.push(meta);
    } catch {
      URL.revokeObjectURL(objectUrl);
    }
  }

  if (added.length === 0) {return;}
  store.setAppState({ ...store.state, images: [...store.state.images, ...added] });
  store.emit();
}

export function removeImage(imageId: string): void {
  const image = store.getImageById(imageId);
  if (image?.source !== 'user') {return;}

  detachImageFromScene(imageId);
  store.sceneApi?.releaseImageTexture(imageId);

  // The object URL stays alive: undo can bring the image back.

  store.setAppState({
    ...store.state,
    images: store.state.images.filter((entry) => entry.id !== imageId),
    selectedImageId:
      store.state.selectedImageId === imageId ? null : store.state.selectedImageId,
  });
  store.emit();
}

/** Test helper: reset images list to starters only. */
export function resetImagesForTests(): void {
  store.setAppState({
    ...store.state,
    images: [...STARTER_IMAGES],
    selectedImageId: null,
  });
}
