import {
  onSceneApiConnected,
  onSceneApiDisconnected,
} from '@/ui/persistence/project-persistence';
import { migrateMaterialId } from '@/scene/material-ids';
import {
  cloneMaterialPreset,
  resolveBuiltinMaterialPreset,
} from '@/data/material-presets';
import type { SceneApi } from '@/scene/scene-api';
import * as store from './app-store-internals';
import { historySettingsAdapter } from './app-store-history';

export type { AppState } from './app-store-internals';

export {
  setKindParams,
  setPhysicsBodyMode,
  setPhysicsDensityKgPerM3,
  setFabricClothActivePinCorner,
  setBookBackCoverImageId,
  setBookSpineImageId,
  setBookMaterialTint,
  setWallpaperPattern,
  selectPatchHandle,
  setPatchAddPointMode,
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
  
} from './app-store-user-baked-assets';

export {
  
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
  undoSceneChange,
  redoSceneChange,
} from './app-store-scene-entities';

export {
  selectMaterial,
  addMaterial,
  updateMaterial,
  duplicateMaterial,
  removeMaterial,
} from './app-store-materials';

export {
  selectProfile,
  addProfile,
  duplicateProfile,
  renameProfile,
  renameProfilePath,
  removeProfile,
  openProfileEditor,
  closeProfileEditor,
  selectProfileNode,
  editProfilePath,
} from './app-store-profiles';

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
  setAmbientColor,
  setAmbientIntensity,
  setAmbientEnabled,
  setKeyAzimuth,
  setKeyElevation,
  setFillAzimuth,
  setFillElevation,
  setKeyColor,
  setKeyIntensity,
  setKeyCastShadow,
  setKeyEnabled,
  setKeyShadowSoftness,
  setFillShadowSoftness,
  setFillColor,
  setFillIntensity,
  setFillDistance,
  setFillCastShadow,
  setFillEnabled,
  setShowLightFixtures,
  setFixturesReflectInMirror,
} from './app-store-lighting-live';

export {
  setEnvironment,
  setGroundMaterialId,
  setGroundVisible,
  setGroundReceiveShadow,
  setGroundMirrorEnabled,
  setGroundMirrorOpacity,
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
  loadArrangement,
  saveCurrentAsArrangement,
  updateArrangement,
  duplicateArrangement,
  removeArrangement,
} from './app-store-arrangements';

export {
  loadLightingPreset,
  saveCurrentAsLightingPreset,
  updateLightingPreset,
  duplicateLightingPreset,
  removeLightingPreset,
} from './app-store-lighting-presets';

export {
  isAnyViewportHelperEnabled,
  
  toggleViewportHelpersAll,
  setViewportHelperFloorGrid,
  setViewportHelperWorldOrigin,
  setViewportHelperCompassArrows,
  setViewportHelperQuadrantGrid,
  setViewportHelperLightHandles,
} from './app-store-viewport-helpers';

export {
  setExportImageFormat,
  setExportGroundSurface,
  setExportAspectPreset,
  setExportCustomRatio,
  setExportOrientation,
  setExportWidth,
  setExportHeight,
  setExportFrameVisible,
  setViewportPixelSize,
  exportViewportImage,
  
  
  
  type ExportImageFormat,
} from './app-store-export';

export const initAppStore = store.initAppStore;
export const getAppState = store.getAppState;
export const subscribe = store.subscribe;

let historySettingsUnsubscribe: (() => void) | null = null;

export function setSceneApi(api: SceneApi | null): void {
  if (store.sceneApi) {onSceneApiDisconnected();}
  historySettingsUnsubscribe?.();
  historySettingsUnsubscribe = null;
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
    api.setHistorySettingsAdapter(historySettingsAdapter);
    historySettingsUnsubscribe = store.subscribe(() => { api.noteHistorySettingsChanged(); });
    onSceneApiConnected(api);
  } else {
    store.setAppState({ ...store.state, entities: [], selectedEntityId: null });
    store.emit();
  }
}
