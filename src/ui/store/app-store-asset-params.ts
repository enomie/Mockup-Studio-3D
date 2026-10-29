import type { KindParamFamily, KindParamsByFamily } from '@/scene/kind-param-families';












import type { BookMaterialTintPart } from '@/scene/book-material-tints';
import type {
  PatchHandleTarget,
} from '@/scene/asset-triangle-patch';
import type { Rgb } from '@/colors/rgb';
import { cloneAssetMaterials } from '@/scene/material-types';
import { defaultMaterialsForKind } from '@/data/material-presets';

import type { WallpaperPattern } from '@/scene/asset-wall';
import {
  mergeKindParamPatch,
  mergeKindWallpaperPatternPatch,
} from '@/scene/asset-kind-registry';
import type { AssetEntity } from '@/scene/entity-types';
import {
  clampPhysicsDensityKgPerM3,
  normalizePhysicsBodyMode,
  type PhysicsBodyMode,
} from '@/scene/physics-rigid-body';
import type { SceneApi } from '@/scene/scene-api';

export interface AppStoreAssetParamsDeps {
  getEntities: () => readonly AssetEntity[];
  patchEntity: (entityId: string, updater: (entity: AssetEntity) => AssetEntity) => void;
  getSceneApi: () => SceneApi | null;
}

let deps: AppStoreAssetParamsDeps | null = null;

export function wireAppStoreAssetParams(next: AppStoreAssetParamsDeps): void {
  deps = next;
}

function getDeps(): AppStoreAssetParamsDeps {
  if (!deps) {
    throw new Error('wireAppStoreAssetParams must be called before asset param setters');
  }
  return deps;
}

function optimisticParamPatch(
  entityId: string,
  partial: unknown,
): void {
  const { getEntities, patchEntity } = getDeps();
  const entity = getEntities().find((entry) => entry.id === entityId);
  if (!entity) {return;}

  const slice = mergeKindParamPatch(entity.assetKind, entity, partial);
  patchEntity(entityId, (current) => ({ ...current, ...slice }));
}

export function setKindParams<F extends KindParamFamily>(
  family: F,
  entityId: string,
  partial: Partial<KindParamsByFamily[F]>,
): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setKindParams(family, entityId, partial);
}

export function setPhysicsBodyMode(entityId: string, mode: PhysicsBodyMode): void {
  const normalized = normalizePhysicsBodyMode(mode);
  getDeps().patchEntity(entityId, (entity) => ({
    ...entity,
    physicsBodyMode: normalized,
  }));
  getDeps().getSceneApi()?.setPhysicsBodyMode(entityId, normalized);
}

export function setPhysicsDensityKgPerM3(entityId: string, densityKgPerM3: number): void {
  const clamped = clampPhysicsDensityKgPerM3(densityKgPerM3);
  getDeps().patchEntity(entityId, (entity) => ({
    ...entity,
    physicsDensityKgPerM3: clamped,
  }));
  getDeps().getSceneApi()?.setPhysicsDensityKgPerM3(entityId, clamped);
}

export function setFabricClothActivePinCorner(
  entityId: string,
  cornerIndex: number,
): void {
  getDeps().getSceneApi()?.setFabricClothActivePinCorner(entityId, cornerIndex);
}

export function setBookBackCoverImageId(
  entityId: string,
  imageId: string | null,
): void {
  getDeps().patchEntity(entityId, (entity) => ({
    ...entity,
    bookBackCoverImageId: imageId,
  }));
  getDeps().getSceneApi()?.setBookBackCoverImageId(entityId, imageId);
}

export function setBookSpineImageId(entityId: string, imageId: string | null): void {
  getDeps().patchEntity(entityId, (entity) => ({
    ...entity,
    bookSpineImageId: imageId,
  }));
  getDeps().getSceneApi()?.setBookSpineImageId(entityId, imageId);
}

export function setBookMaterialTint(
  entityId: string,
  part: BookMaterialTintPart,
  tint: Rgb,
): void {
  getDeps().patchEntity(entityId, (entity) => {
    const materials = cloneAssetMaterials(
      entity.materials ?? defaultMaterialsForKind(entity.assetKind),
    );
    if (part === 'pages') {
      materials.bookPagesTint = { ...tint };
    } else {
      materials.bookCoverTint = { ...tint };
    }
    return { ...entity, materials };
  });
  getDeps().getSceneApi()?.setBookMaterialTint(entityId, part, tint);
}

export function selectPatchHandle(
  entityId: string,
  nodeIndex: number,
  targetKey: PatchHandleTarget,
): void {
  getDeps().getSceneApi()?.selectPatchHandle(entityId, nodeIndex, targetKey);
}

export function setWallpaperPattern(
  entityId: string,
  partial: Partial<WallpaperPattern>,
): void {
  const { getEntities, patchEntity, getSceneApi } = getDeps();
  const entity = getEntities().find((entry) => entry.id === entityId);
  if (entity) {
    const slice = mergeKindWallpaperPatternPatch(entity.assetKind, entity, partial);
    patchEntity(entityId, (current) => ({ ...current, ...slice }));
  }
  getSceneApi()?.setWallpaperPattern(entityId, partial);
}
