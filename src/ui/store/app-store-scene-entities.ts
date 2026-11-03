import type {
  AssetFaceContent,
  AssetFaceId,
  AssetGeometryPart,
  AssetKind,
  EntityTransform,
  MaterialEntitySlot,
} from '@/scene/entity-types';
import type { AssetImageSurfaceId, ImageSurfaceSettings } from '@/scene/image-surface';
import type { Rgb } from '@/colors/rgb';
import * as store from './app-store-internals';

export function addAssetFromCatalog(assetKind: AssetKind): void {
  store.sceneApi?.addAsset(assetKind);
}


export function setSelectedEntity(entityId: string | null): void {
  store.sceneApi?.selectEntity(entityId);
  store.setAppState({
    ...store.state,
    selectedEntityId: entityId,
    selectedEntityIds: entityId && store.sceneApi ? [...store.sceneApi.getSelectedEntityIds()] : [],
  });
  store.emit();
}

export function setSelectionGroupCenter(center: { x: number; y: number; z: number }): void {
  store.sceneApi?.setSelectionGroupCenter(center);
}

export function setSelectionGroupRotation(rotation: { x: number; y: number; z: number }): void {
  store.sceneApi?.setSelectionGroupRotation(rotation);
}

export function setSelectionGroupScale(scale: number): void {
  store.sceneApi?.setSelectionGroupScale(scale);
}

/** Shift-click in the scene list: adds or removes an asset from the selection. */
export function toggleEntitySelection(entityId: string): void {
  const api = store.sceneApi;
  if (!api) {return;}
  api.toggleEntitySelection(entityId);
  store.setAppState({
    ...store.state,
    selectedEntityId: api.getSelectedEntityId(),
    selectedEntityIds: [...api.getSelectedEntityIds()],
  });
  store.emit();
}


export function removeEntity(entityId: string): void {
  store.sceneApi?.removeEntity(entityId);
}


export function setEntityTransform(
  entityId: string,
  partial: Partial<EntityTransform>,
): void {
  store.sceneApi?.setEntityTransform(entityId, partial);
}


export function setAssetScreenImage(entityId: string, imageId: string | null): void {
  store.sceneApi?.setAssetImage(entityId, imageId);
}


export function setAssetFace(
  entityId: string,
  faceId: AssetFaceId,
  content: AssetFaceContent,
): void {
  store.sceneApi?.setAssetFace(entityId, faceId, content);
}


export function setAssetDepth(entityId: string, depthM: number): void {
  store.sceneApi?.setAssetDepth(entityId, depthM);
}


export function setAssetSizeScale(entityId: string, sizeScale: number): void {
  store.sceneApi?.setAssetSizeScale(entityId, sizeScale);
}


export function setEntityVisible(entityId: string, visible: boolean): void {
  store.sceneApi?.setEntityVisible(entityId, visible);
}


export function setEntityMaterial(
  entityId: string,
  slot: MaterialEntitySlot,
  materialId: string,
): void {
  store.sceneApi?.setEntityMaterial(entityId, slot, materialId);
}


/** Finish slider (0 = matt, 1 = glossy) for a slot holding Paper. */
export function setEntityMaterialGloss(
  entityId: string,
  slot: MaterialEntitySlot,
  gloss: number,
): void {
  store.sceneApi?.setEntityMaterialGloss(entityId, slot, gloss);
}


export function setFaceTint(
  entityId: string,
  faceId: AssetFaceId,
  tint: Rgb,
): void {
  store.sceneApi?.setFaceTint(entityId, faceId, tint);
}


export function setImageSurface(
  entityId: string,
  faceId: AssetImageSurfaceId,
  partial: Partial<ImageSurfaceSettings>,
): void {
  store.sceneApi?.setImageSurface(entityId, faceId, partial);
}


export function setGeometryVisible(
  entityId: string,
  part: AssetGeometryPart,
  visible: boolean,
): void {
  store.sceneApi?.setGeometryVisible(entityId, part, visible);
}


export function undoSceneChange(): void {
  store.sceneApi?.undo();
}

export function redoSceneChange(): void {
  store.sceneApi?.redo();
}
