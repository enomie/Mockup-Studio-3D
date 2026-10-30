import type { Rgb } from '@/colors/rgb';
import type { PatchHandleTarget } from '@/scene/asset-triangle-patch';
import type { WallpaperPattern } from '@/scene/asset-wall';
import type { BookMaterialTintPart } from '@/scene/book-material-tints';
import type { KindParamFamily, KindParamsByFamily } from '@/scene/kind-param-families';
import type { PhysicsBodyMode } from '@/scene/physics-rigid-body';
import * as store from './app-store-internals';

// Entity edits are forwarded to the engine only. The engine patches its registry
// synchronously and the store mirrors the result via syncEngineStateFromEngine.

export function setKindParams<F extends KindParamFamily>(
  family: F,
  entityId: string,
  partial: Partial<KindParamsByFamily[F]>,
): void {
  store.sceneApi?.setKindParams(family, entityId, partial);
}

export function setPhysicsBodyMode(entityId: string, mode: PhysicsBodyMode): void {
  store.sceneApi?.setPhysicsBodyMode(entityId, mode);
}

export function setPhysicsDensityKgPerM3(entityId: string, densityKgPerM3: number): void {
  store.sceneApi?.setPhysicsDensityKgPerM3(entityId, densityKgPerM3);
}

export function setFabricClothActivePinCorner(entityId: string, cornerIndex: number): void {
  store.sceneApi?.setFabricClothActivePinCorner(entityId, cornerIndex);
}

export function setBookBackCoverImageId(entityId: string, imageId: string | null): void {
  store.sceneApi?.setBookBackCoverImageId(entityId, imageId);
}

export function setBookSpineImageId(entityId: string, imageId: string | null): void {
  store.sceneApi?.setBookSpineImageId(entityId, imageId);
}

export function setBookMaterialTint(
  entityId: string,
  part: BookMaterialTintPart,
  tint: Rgb,
): void {
  store.sceneApi?.setBookMaterialTint(entityId, part, tint);
}

export function selectPatchHandle(
  entityId: string,
  nodeIndex: number,
  targetKey: PatchHandleTarget,
): void {
  store.sceneApi?.selectPatchHandle(entityId, nodeIndex, targetKey);
}

export function setWallpaperPattern(entityId: string, partial: Partial<WallpaperPattern>): void {
  store.sceneApi?.setWallpaperPattern(entityId, partial);
}
