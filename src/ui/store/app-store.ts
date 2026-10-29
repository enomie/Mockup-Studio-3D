import { migrateMaterialId } from '@/scene/material-ids';
import {
  cloneMaterialPreset,
  resolveBuiltinMaterialPreset,
} from '@/data/material-presets';
import type { SceneApi } from '@/scene/scene-api';
import { wireAppStoreAssetParams } from './app-store-asset-params';
import * as store from './app-store-internals';

export type { AppState } from './app-store-internals';

export {
  setBeverageCanParams,
  setBlockParams,
  setCylinderParams,
  setSphereParams,
  setWheelCarParams,
  setPhysicsBodyMode,
  setPhysicsDensityKgPerM3,
  setFabricClothParams,
  setFabricClothActivePinCorner,
  setBookParams,
  setBookBackCoverImageId,
  setBookSpineImageId,
  setBookMaterialTint,
  setHandheldParams,
  setMonitorParams,
  setPrintParams,
  setTinCanParams,
  setWallParams,
  setWallpaperPattern,
  setWineBottleParams,
  setPenParams,
  setTrianglePatchParams,
  selectPatchHandle,
} from './app-store-asset-params';

export {
  addImagesFromFiles,
  removeImage,
  selectImage,
} from './app-store-images';

export {
  addAssetFromUserBaked,
  bakeSelectedToUserAsset,
  canBakeSelectedEntity,
  removeUserBakedAsset,
  renameUserBakedAsset,
} from './app-store-user-baked-assets';

export {
  addAssetFromCatalog,
  setSelectedEntity,
  removeEntity,
  setEntityTransform,
  setAssetScreenImage,
  setAssetFace,
  setAssetDepth,
  setAssetSizeScale,
  setEntityVisible,
  setEntityMaterial,
  setFaceTint,
  setImageSurface,
  setGeometryVisible,
} from './app-store-scene-entities';

export {
  selectMaterial,
  addMaterial,
  updateMaterial,
  duplicateMaterial,
  removeMaterial,
} from './app-store-materials';

export {
  selectColor,
  addColor,
  updateColor,
  duplicateColor,
  removeColor,
} from './app-store-colors';

export {
  setGravityScale,
  startPhysicsRigidTest,
  stopPhysicsRigidTest,
  startWorldPhysics,
  toggleWorldPhysicsPause,
  resetWorldPhysics,
} from './app-store-physics';

export {
  setMode,
  setLightingReferenceMode,
  setAmbientColor,
  setAmbientIntensity,
  setAmbientEnabled,
  setKeySide,
  setKeyColor,
  setKeyIntensity,
  setKeyCastShadow,
  setKeyEnabled,
  setKeyShadowSoftness,
  setFillShadowSoftness,
  setFillColor,
  setFillIntensityRatio,
  setFillDistance,
  setFillCastShadow,
  setFillEnabled,
  setShowLightFixtures,
  setFixturesReflectInMirror,
} from './app-store-lighting-live';

export {
  setSkyEnabled,
  setSkyHorizonColor,
  setSkyZenithColor,
  setSkyGradientFade,
  setGroundMaterialId,
  setGroundVisible,
  setGroundReceiveShadow,
  setGroundMirrorEnabled,
  setGroundMirrorOpacity,
  setFogEnabled,
  setFogColor,
  setFogDistances,
  setReflectionEnabled,
  setReflectionIntensity,
} from './app-store-atmosphere';

export {
  loadBuiltinView,
  captureSlot,
  loadSlot,
  clearSlot,
  renameSlot,
  setCameraProjection,
  setCameraFov,
  setCameraOrthoZoom,
  getCameraReadoutSnapshot,
  setCameraPosition,
  setCameraTarget,
  setCameraDistance,
  setCameraAzimuthDeg,
  setCameraElevationDeg,
  resetCameraAzimuth,
  resetCameraElevation,
} from './app-store-camera';

export {
  loadEnvironment,
  saveCurrentAsEnvironment,
  updateEnvironment,
  duplicateEnvironment,
  removeEnvironment,
} from './app-store-environment-presets';

export {
  loadLightingPreset,
  saveCurrentAsLightingPreset,
  updateLightingPreset,
  duplicateLightingPreset,
  removeLightingPreset,
} from './app-store-lighting-presets';

export {
  isAnyViewportHelperEnabled,
  setViewportHelpersAllEnabled,
  toggleViewportHelpersAll,
  setViewportHelperFloorGrid,
  setViewportHelperWorldOrigin,
  setViewportHelperForwardArrow,
  setViewportHelperLightHandles,
} from './app-store-viewport-helpers';

export {
  setExportImageFormat,
  setExportGroundSurface,
  exportViewportImage,
  type ExportGroundSurface,
  type ExportImageFormat,
} from './app-store-export';

export const initAppStore = store.initAppStore;
export const getAppState = store.getAppState;
export const subscribe = store.subscribe;

wireAppStoreAssetParams({
  getEntities: () => store.state.entities,
  patchEntity: store.patchEntity,
  getSceneApi: () => store.sceneApi,
});

export function setSceneApi(api: SceneApi | null): void {
  store.engineUnsubscribe?.();
  store.setEngineUnsubscribeRef(null);
  store.setSceneApiRef(api);

  if (api) {
    api.setImageResolver((imageId) => {
      const image = store.getImageById(imageId);
      if (!image) {return null;}
      return {
        url: image.url,
        width: image.width,
        height: image.height,
        name: image.name,
      };
    });

    api.setUserBakedAssetResolver((userBakedAssetId) =>
      store.state.userBakedAssets.find((entry) => entry.id === userBakedAssetId) ?? null,
    );

    api.setMaterialPresetResolver((materialId) => {
      const resolvedId = migrateMaterialId(materialId);
      const material =
        store.getMaterialById(resolvedId) ??
        resolveBuiltinMaterialPreset(resolvedId);
      return material ? cloneMaterialPreset(material) : null;
    });

    store.setEngineUnsubscribeRef(api.subscribe(() => {
      store.syncEngineStateFromEngine();
    }));

    api.setMode(store.state.mode);
    store.syncEnvironmentToScene();
    store.syncGroundToScene();
    store.syncLightingToScene();
    api.applyViewportHelpers(store.state.viewportHelpers);
    store.syncEngineStateFromEngine();
  } else {
    store.setAppState({ ...store.state, entities: [], selectedEntityId: null });
    store.emit();
  }
}
