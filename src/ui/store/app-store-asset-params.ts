import type { HandheldDeviceParams } from '@/scene/asset-handheld';
import type { MonitorDeviceParams } from '@/scene/asset-monitor';
import type { BeverageCanParams } from '@/scene/asset-beverage-can';
import type { TinCanParams } from '@/scene/asset-tin-can';
import type { WineBottleParams } from '@/scene/asset-wine-bottle';
import type { PenParams } from '@/scene/asset-pen';
import type { BlockParams } from '@/scene/asset-block';
import type { CylinderParams } from '@/scene/asset-cylinder';
import type { SphereParams } from '@/scene/asset-sphere';
import type { WheelCarParams } from '@/scene/asset-wheel-car';
import type { FabricClothParams } from '@/scene/asset-fabric-cloth';
import type { BookParams } from '@/scene/asset-book';
import type { BookMaterialTintPart } from '@/scene/book-material-tints';
import type { Rgb } from '@/colors/rgb';
import { cloneAssetMaterials } from '@/scene/material-types';
import { defaultMaterialsForKind } from '@/data/material-presets';
import type { PrintDeviceParams } from '@/scene/asset-print';
import type { WallParams, WallpaperPattern } from '@/scene/asset-wall';
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

export function setHandheldParams(
  entityId: string,
  partial: Partial<HandheldDeviceParams>,
): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setHandheldParams(entityId, partial);
}

export function setMonitorParams(
  entityId: string,
  partial: Partial<MonitorDeviceParams>,
): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setMonitorParams(entityId, partial);
}

export function setPrintParams(
  entityId: string,
  partial: Partial<PrintDeviceParams>,
): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setPrintParams(entityId, partial);
}

export function setWallParams(entityId: string, partial: Partial<WallParams>): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setWallParams(entityId, partial);
}

export function setBlockParams(entityId: string, partial: Partial<BlockParams>): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setBlockParams(entityId, partial);
}

export function setCylinderParams(entityId: string, partial: Partial<CylinderParams>): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setCylinderParams(entityId, partial);
}

export function setSphereParams(entityId: string, partial: Partial<SphereParams>): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setSphereParams(entityId, partial);
}

export function setWheelCarParams(entityId: string, partial: Partial<WheelCarParams>): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setWheelCarParams(entityId, partial);
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

export function setFabricClothParams(
  entityId: string,
  partial: Partial<FabricClothParams>,
): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setFabricClothParams(entityId, partial);
}

export function setBookParams(entityId: string, partial: Partial<BookParams>): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setBookParams(entityId, partial);
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

export function setBeverageCanParams(
  entityId: string,
  partial: Partial<BeverageCanParams>,
): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setBeverageCanParams(entityId, partial);
}

export function setTinCanParams(
  entityId: string,
  partial: Partial<TinCanParams>,
): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setTinCanParams(entityId, partial);
}

export function setWineBottleParams(
  entityId: string,
  partial: Partial<WineBottleParams>,
): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setWineBottleParams(entityId, partial);
}

export function setPenParams(entityId: string, partial: Partial<PenParams>): void {
  optimisticParamPatch(entityId, partial);
  getDeps().getSceneApi()?.setPenParams(entityId, partial);
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
