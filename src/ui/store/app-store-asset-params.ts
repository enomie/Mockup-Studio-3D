import type { HandheldDeviceParams } from '@/scene/asset-handheld';
import type { MonitorDeviceParams } from '@/scene/asset-monitor';
import type { BeverageCanParams } from '@/scene/asset-beverage-can';
import type { TinCanParams } from '@/scene/asset-tin-can';
import type { WineBottleParams } from '@/scene/asset-wine-bottle';
import type { BlockParams } from '@/scene/asset-block';
import type { PrintDeviceParams } from '@/scene/asset-print';
import type { WallParams, WallpaperPattern } from '@/scene/asset-wall';
import {
  mergeKindParamPatch,
  mergeKindWallpaperPatternPatch,
} from '@/scene/asset-kind-registry';
import type { AssetEntity } from '@/scene/entity-types';
import type { SceneApi } from '@/scene/scene-api';

export type AppStoreAssetParamsDeps = {
  getEntities: () => readonly AssetEntity[];
  patchEntity: (entityId: string, updater: (entity: AssetEntity) => AssetEntity) => void;
  getSceneApi: () => SceneApi | null;
};

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
  if (!entity) return;

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
