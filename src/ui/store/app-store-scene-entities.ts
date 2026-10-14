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
  store.setAppState({ ...store.state, selectedEntityId: entityId });
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

