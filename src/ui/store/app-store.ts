import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import {
  detectOrientation,
  STARTER_IMAGES,
  type ImageAsset,
} from '@/data/image-assets';
import type { Rgb } from '@/colors/rgb';
import {
  cloneColorPreset,
  COLOR_NEARWHITE_ID,
  COLOR_PRESETS,
  resolveBuiltinColorPreset,
} from '@/data/color-presets';
import {
  BUILTIN_ENV_DEFAULT_ID,
  cloneEnvironmentPreset,
  ENVIRONMENT_PRESETS,
  resolveBuiltinEnvironmentPreset,
} from '@/data/builtin-environments';
import {
  BUILTIN_LIGHT_DEFAULT_ID,
  cloneLightingPreset,
  LIGHTING_PRESETS,
  resolveBuiltinLightingPreset,
} from '@/data/builtin-light-rigs';
import {
  cloneMaterialPreset,
  MATERIAL_PRESETS,
  resolveBuiltinMaterialPreset,
} from '@/data/material-presets';
import { applyAtmosphereSnapshot } from '@/scene/atmosphere-snapshot';
import {
  cloneAtmosphereSnapshot,
  type AtmosphereSnapshot,
  type EnvironmentPreset,
} from '@/scene/environment-preset-types';
import { normalizeGroundSettings } from '@/scene/ground-settings';
import {
  cloneLightingSettings,
  type LightingPreset,
} from '@/scene/lighting-preset-types';
import { mergeLightingSettings } from '@/scene/lighting-merge';
import type { ColorPreset } from '@/scene/color-types';
import {
  type ExportGroundSurface,
  type ExportImageFormat,
  viewportExportDownloadFilename,
} from '@/scene/export-image';
import type {
  AssetEntity,
  AssetFaceContent,
  AssetFaceId,
  AssetGeometryPart,
  AssetKind,
  EntityTransform,
  MaterialEntitySlot,
  MaterialPreset,
  Vec3,
} from '@/scene/entity-types';
import type { AssetImageSurfaceId, ImageSurfaceSettings } from '@/scene/image-surface';
import { migrateMaterialId } from '@/scene/material-ids';
import type { MaterialKind } from '@/scene/material-types';
import type {
  AppMode,
  BuiltinCameraViewId,
  CameraProjection,
  CameraReadout,
  CameraSettings,
  CameraSlot,
  CameraSlotIndex,
  DeepPartial,
  EnvironmentState,
  GroundSettings,
  LightingReferenceMode,
  LightingSettings,
  SceneApi,
  StudioLightSide,
} from '@/scene/scene-api';
import { wireAppStoreAssetParams } from './app-store-asset-params';

export {
  setBeverageCanParams,
  setBlockParams,
  setHandheldParams,
  setMonitorParams,
  setPrintParams,
  setTinCanParams,
  setWallParams,
  setWallpaperPattern,
  setWineBottleParams,
} from './app-store-asset-params';

export type AppState = {
  webgpuAvailable: boolean;
  mode: AppMode;
  lighting: LightingSettings;
  skyEnabled: boolean;
  skyHorizonColor: Rgb;
  skyZenithColor: Rgb;
  skyGradientFade: number;
  fogEnabled: boolean;
  ground: GroundSettings;
  fogColor: Rgb;
  fogNear: number;
  fogFar: number;
  reflectionEnabled: boolean;
  reflectionIntensity: number;
  images: ImageAsset[];
  materials: MaterialPreset[];
  selectedMaterialId: string | null;
  colors: ColorPreset[];
  selectedColorId: string | null;
  environments: EnvironmentPreset[];
  activeEnvironmentId: string;
  lightingPresets: LightingPreset[];
  activeLightingPresetId: string;
  entities: AssetEntity[];
  selectedEntityId: string | null;
  camera: CameraSettings;
  exportImageFormat: ExportImageFormat;
  exportGroundSurface: ExportGroundSurface;
  exportHideLightFixtures: boolean;
};

const listeners = new Set<() => void>();
let sceneApi: SceneApi | null = null;
let engineUnsubscribe: (() => void) | null = null;

const { environment, ground, lighting, camera } = SCENE_DEFAULTS;

let state: AppState = {
  webgpuAvailable: false,
  mode: 'select',
  lighting: cloneLightingSettings(lighting),
  skyEnabled: environment.skyEnabled,
  skyHorizonColor: { ...environment.skyHorizonColor },
  skyZenithColor: { ...environment.skyZenithColor },
  skyGradientFade: environment.skyGradientFade,
  fogEnabled: environment.fogEnabled,
  ground: {
    visible: ground.visible,
    materialId: ground.materialId,
    receiveShadow: ground.receiveShadow,
    mirrorEnabled: ground.mirrorEnabled,
    mirrorOpacity: ground.mirrorOpacity,
  },
  fogColor: { ...environment.fogColor },
  fogNear: environment.fogNear,
  fogFar: environment.fogFar,
  reflectionEnabled: environment.reflectionEnabled,
  reflectionIntensity: environment.reflectionIntensity,
  images: [...STARTER_IMAGES],
  materials: MATERIAL_PRESETS.map(cloneMaterialPreset),
  selectedMaterialId: null,
  colors: COLOR_PRESETS.map(cloneColorPreset),
  selectedColorId: null,
  environments: ENVIRONMENT_PRESETS.map(cloneEnvironmentPreset),
  activeEnvironmentId: BUILTIN_ENV_DEFAULT_ID,
  lightingPresets: LIGHTING_PRESETS.map(cloneLightingPreset),
  activeLightingPresetId: BUILTIN_LIGHT_DEFAULT_ID,
  entities: [],
  selectedEntityId: null,
  camera: cloneCameraSettings(camera.settings),
  exportImageFormat: 'png-transparent',
  exportGroundSurface: 'viewport',
  exportHideLightFixtures: false,
};

const MATERIAL_UPDATE_DEBOUNCE_MS = 75;
let materialUpdateTimer: ReturnType<typeof setTimeout> | null = null;
const pendingMaterialInvalidations = new Set<string>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function patchEntity(
  entityId: string,
  updater: (entity: AssetEntity) => AssetEntity,
): void {
  const index = state.entities.findIndex((entry) => entry.id === entityId);
  if (index < 0) return;

  state = {
    ...state,
    entities: state.entities.map((entry, i) =>
      i === index ? updater(entry) : entry,
    ),
  };
  emit();
}

wireAppStoreAssetParams({
  getEntities: () => state.entities,
  patchEntity,
  getSceneApi: () => sceneApi,
});

function cloneGround(settings: GroundSettings): GroundSettings {
  return normalizeGroundSettings(settings);
}

function cloneCameraSlot(slot: CameraSlot): CameraSlot {
  if (!slot) return null;
  return {
    ...slot,
    position: { ...slot.position },
    target: { ...slot.target },
  };
}

function cloneCameraSettings(settings: CameraSettings): CameraSettings {
  return {
    projection: settings.projection,
    fov: settings.fov,
    orthoZoom: settings.orthoZoom,
    slots: settings.slots.map(cloneCameraSlot) as [
      CameraSlot,
      CameraSlot,
      CameraSlot,
    ],
  };
}

function getEnvironmentState(): EnvironmentState {
  return {
    skyEnabled: state.skyEnabled,
    skyHorizonColor: state.skyHorizonColor,
    skyZenithColor: state.skyZenithColor,
    skyGradientFade: state.skyGradientFade,
    fogEnabled: state.fogEnabled,
    fogColor: state.fogColor,
    fogNear: state.fogNear,
    fogFar: state.fogFar,
    reflectionEnabled: state.reflectionEnabled,
    reflectionIntensity: state.reflectionIntensity,
  };
}

function captureAtmosphereFromState(): AtmosphereSnapshot {
  return cloneAtmosphereSnapshot({
    environment: getEnvironmentState(),
    ground: cloneGround(state.ground),
    lighting: cloneLightingSettings(state.lighting),
  });
}

function applyAtmosphereToStateAndScene(
  snapshot: AtmosphereSnapshot,
  activeEnvironmentId?: string,
): void {
  const { environment, ground, lighting } = snapshot;
  state = {
    ...state,
    skyEnabled: environment.skyEnabled,
    skyHorizonColor: { ...environment.skyHorizonColor },
    skyZenithColor: { ...environment.skyZenithColor },
    skyGradientFade: environment.skyGradientFade,
    fogEnabled: environment.fogEnabled,
    fogColor: { ...environment.fogColor },
    fogNear: environment.fogNear,
    fogFar: environment.fogFar,
    reflectionEnabled: environment.reflectionEnabled,
    reflectionIntensity: environment.reflectionIntensity,
    ground: cloneGround(ground),
    lighting: cloneLightingSettings(lighting),
    ...(activeEnvironmentId !== undefined
      ? { activeEnvironmentId }
      : {}),
  };
  if (sceneApi) {
    applyAtmosphereSnapshot(sceneApi, snapshot);
  }
  emit();
}

function syncEnvironmentToScene(): void {
  sceneApi?.applyEnvironment(getEnvironmentState());
}

function syncGroundToScene(): void {
  sceneApi?.applyGround(state.ground);
}

function syncLightingToScene(): void {
  sceneApi?.applyLighting(state.lighting);
}

function syncCameraFromEngine(): void {
  if (!sceneApi) return;
  state = {
    ...state,
    camera: cloneCameraSettings(sceneApi.getCameraSettings()),
  };
}

function syncEngineStateFromEngine(): void {
  if (!sceneApi) return;
  state = {
    ...state,
    lighting: cloneLightingSettings(sceneApi.getLighting()),
    entities: [...sceneApi.getEntities()],
    selectedEntityId: sceneApi.getSelectedEntityId(),
    camera: cloneCameraSettings(sceneApi.getCameraSettings()),
  };
  emit();
}

function patchLighting(partial: DeepPartial<LightingSettings>): void {
  const nextLighting = mergeLightingSettings(state.lighting, partial);
  state = { ...state, lighting: nextLighting };
  sceneApi?.setLighting(partial);
  emit();
}

function patchGround(partial: Partial<GroundSettings>): void {
  const nextGround = cloneGround({
    ...state.ground,
    ...partial,
  });
  state = { ...state, ground: nextGround };
  sceneApi?.setGround(partial);
  emit();
}

export function initAppStore(): void {
  state = {
    ...state,
    webgpuAvailable: Boolean(navigator.gpu),
  };
  emit();
}

export function getAppState(): AppState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getImageById(imageId: string): ImageAsset | undefined {
  return state.images.find((image) => image.id === imageId);
}

function getMaterialById(materialId: string): MaterialPreset | undefined {
  const resolvedId = migrateMaterialId(materialId);
  return state.materials.find((material) => material.id === resolvedId);
}

function scheduleMaterialInvalidation(materialId: string): void {
  pendingMaterialInvalidations.add(materialId);
  if (materialUpdateTimer) clearTimeout(materialUpdateTimer);
  materialUpdateTimer = setTimeout(() => {
    materialUpdateTimer = null;
    const ids = [...pendingMaterialInvalidations];
    pendingMaterialInvalidations.clear();
    for (const id of ids) {
      sceneApi?.invalidateMaterial(id);
    }
  }, MATERIAL_UPDATE_DEBOUNCE_MS);
}

export function setSceneApi(api: SceneApi | null): void {
  engineUnsubscribe?.();
  engineUnsubscribe = null;
  sceneApi = api;

  if (api) {
    api.setImageResolver((imageId) => {
      const image = getImageById(imageId);
      if (!image) return null;
      return {
        url: image.url,
        width: image.width,
        height: image.height,
        name: image.name,
      };
    });

    api.setMaterialPresetResolver((materialId) => {
      const resolvedId = migrateMaterialId(materialId);
      const material =
        getMaterialById(resolvedId) ?? resolveBuiltinMaterialPreset(resolvedId);
      return material ? cloneMaterialPreset(material) : null;
    });

    engineUnsubscribe = api.subscribe(() => {
      syncEngineStateFromEngine();
    });

    api.setMode(state.mode);
    syncEnvironmentToScene();
    syncGroundToScene();
    syncLightingToScene();
    syncEngineStateFromEngine();
  } else {
    state = { ...state, entities: [], selectedEntityId: null };
    emit();
  }
}

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);
const ALLOWED_IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

function isAllowedImageFile(file: File): boolean {
  if (file.type && ALLOWED_IMAGE_MIME.has(file.type)) return true;
  return ALLOWED_IMAGE_EXT.test(file.name);
}

export async function addImagesFromFiles(files: FileList | File[]): Promise<void> {
  const added: ImageAsset[] = [];

  for (const file of Array.from(files)) {
    if (!isAllowedImageFile(file)) continue;
    const objectUrl = URL.createObjectURL(file);
    try {
      const meta = await loadImageMeta(file, objectUrl);
      added.push(meta);
    } catch {
      URL.revokeObjectURL(objectUrl);
    }
  }

  if (added.length === 0) return;
  state = { ...state, images: [...state.images, ...added] };
  emit();
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
    img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
    img.src = objectUrl;
  });
}

export function addAssetFromCatalog(assetKind: AssetKind): void {
  sceneApi?.addAsset(assetKind);
}

export function setSelectedEntity(entityId: string | null): void {
  sceneApi?.selectEntity(entityId);
}

export function removeEntity(entityId: string): void {
  sceneApi?.removeEntity(entityId);
}

export function setEntityTransform(
  entityId: string,
  partial: Partial<EntityTransform>,
): void {
  sceneApi?.setEntityTransform(entityId, partial);
}

export function setAssetScreenImage(entityId: string, imageId: string | null): void {
  sceneApi?.setAssetImage(entityId, imageId);
}

export function setAssetFace(
  entityId: string,
  faceId: AssetFaceId,
  content: AssetFaceContent,
): void {
  sceneApi?.setAssetFace(entityId, faceId, content);
}

export function setAssetDepth(entityId: string, depthM: number): void {
  sceneApi?.setAssetDepth(entityId, depthM);
}

export function setAssetSizeScale(entityId: string, sizeScale: number): void {
  sceneApi?.setAssetSizeScale(entityId, sizeScale);
}

export function setEntityVisible(entityId: string, visible: boolean): void {
  sceneApi?.setEntityVisible(entityId, visible);
}

export function selectMaterial(materialId: string | null): void {
  state = { ...state, selectedMaterialId: materialId };
  emit();
}

export function addMaterial(kind: MaterialKind = 'solid-pbr'): string {
  const id = `user-${crypto.randomUUID()}`;
  const preset: MaterialPreset = {
    id,
    name: 'New material',
    source: 'user',
    kind,
    color: { r: 0.8, g: 0.8, b: 0.8 },
    roughness: 0.5,
    metalness: 0,
    ...(kind === 'transmission'
      ? {
          glassVariant: 'pane' as const,
          ior: 1.5,
          tint: { r: 1, g: 1, b: 1 },
        }
      : {}),
  };

  state = {
    ...state,
    materials: [...state.materials, preset],
    selectedMaterialId: id,
  };
  emit();
  return id;
}

export function updateMaterial(
  materialId: string,
  partial: Partial<MaterialPreset>,
): void {
  const index = state.materials.findIndex((material) => material.id === materialId);
  if (index < 0) return;

  const current = state.materials[index];
  const next: MaterialPreset = {
    ...current,
    ...partial,
    color: partial.color ? { ...partial.color } : current.color,
    tint: partial.tint ? { ...partial.tint } : current.tint,
  };

  const materials = [...state.materials];
  materials[index] = next;
  state = { ...state, materials };
  emit();
  scheduleMaterialInvalidation(materialId);
}

export function duplicateMaterial(materialId: string): string | null {
  const source = getMaterialById(materialId);
  if (!source) return null;

  const id = `user-${crypto.randomUUID()}`;
  const copy: MaterialPreset = {
    ...cloneMaterialPreset(source),
    id,
    name: `${source.name} copy`,
    source: 'user',
  };

  state = {
    ...state,
    materials: [...state.materials, copy],
    selectedMaterialId: id,
  };
  emit();
  return id;
}

export function removeMaterial(materialId: string): void {
  const material = getMaterialById(materialId);
  if (!material || material.source !== 'user') return;

  state = {
    ...state,
    materials: state.materials.filter((entry) => entry.id !== materialId),
    selectedMaterialId:
      state.selectedMaterialId === materialId ? null : state.selectedMaterialId,
  };
  emit();
}

function getColorById(colorId: string): ColorPreset | undefined {
  return state.colors.find((color) => color.id === colorId);
}

export function selectColor(colorId: string | null): void {
  state = { ...state, selectedColorId: colorId };
  emit();
}

export function addColor(): string {
  const nearwhite = resolveBuiltinColorPreset(COLOR_NEARWHITE_ID);
  const id = `user-${crypto.randomUUID()}`;
  const preset: ColorPreset = {
    id,
    name: 'New color',
    source: 'user',
    rgb: nearwhite ? { ...nearwhite.rgb } : { r: 0.8, g: 0.8, b: 0.8 },
  };

  state = {
    ...state,
    colors: [...state.colors, preset],
    selectedColorId: id,
  };
  emit();
  return id;
}

export function updateColor(colorId: string, partial: Partial<ColorPreset>): void {
  const index = state.colors.findIndex((color) => color.id === colorId);
  if (index < 0) return;

  const current = state.colors[index];
  const next: ColorPreset = {
    ...current,
    ...partial,
    rgb: partial.rgb ? { ...partial.rgb } : current.rgb,
  };

  const colors = [...state.colors];
  colors[index] = next;
  state = { ...state, colors };
  emit();
}

export function duplicateColor(colorId: string): string | null {
  const source = getColorById(colorId) ?? resolveBuiltinColorPreset(colorId);
  if (!source) return null;

  const id = `user-${crypto.randomUUID()}`;
  const copy: ColorPreset = {
    ...cloneColorPreset(source),
    id,
    name: `${source.name} copy`,
    source: 'user',
  };

  state = {
    ...state,
    colors: [...state.colors, copy],
    selectedColorId: id,
  };
  emit();
  return id;
}

export function removeColor(colorId: string): void {
  const color = getColorById(colorId);
  if (!color || color.source !== 'user') return;

  state = {
    ...state,
    colors: state.colors.filter((entry) => entry.id !== colorId),
    selectedColorId: state.selectedColorId === colorId ? null : state.selectedColorId,
  };
  emit();
}

export function setEntityMaterial(
  entityId: string,
  slot: MaterialEntitySlot,
  materialId: string,
): void {
  sceneApi?.setEntityMaterial(entityId, slot, materialId);
}

export function setFaceTint(
  entityId: string,
  faceId: AssetFaceId,
  tint: Rgb,
): void {
  sceneApi?.setFaceTint(entityId, faceId, tint);
}

export function setImageSurface(
  entityId: string,
  faceId: AssetImageSurfaceId,
  partial: Partial<ImageSurfaceSettings>,
): void {
  sceneApi?.setImageSurface(entityId, faceId, partial);
}

export function setGeometryVisible(
  entityId: string,
  part: AssetGeometryPart,
  visible: boolean,
): void {
  sceneApi?.setGeometryVisible(entityId, part, visible);
}

export function setMode(mode: AppMode): void {
  state = { ...state, mode };
  sceneApi?.setMode(mode);
  emit();
}

export function setLightingReferenceMode(referenceMode: LightingReferenceMode): void {
  patchLighting({ referenceMode });
}

export function setAmbientColor(rgb: Rgb): void {
  patchLighting({ ambient: { color: rgb } });
}

export function setAmbientIntensity(intensity: number): void {
  patchLighting({ ambient: { intensity } });
}

export function setAmbientEnabled(enabled: boolean): void {
  patchLighting({ ambient: { enabled } });
}

export function setKeySide(side: StudioLightSide): void {
  patchLighting({ key: { side } });
}

export function setKeyColor(rgb: Rgb): void {
  patchLighting({ key: { color: rgb } });
}

export function setKeyIntensity(intensity: number): void {
  patchLighting({ key: { intensity } });
}

export function setKeyCastShadow(castShadow: boolean): void {
  patchLighting({ key: { castShadow } });
}

export function setKeyEnabled(enabled: boolean): void {
  patchLighting({ key: { enabled } });
  if (!enabled && state.selectedEntityId === 'light-key') {
    setSelectedEntity(null);
  }
}

export function setKeyShadowSoftness(shadowSoftness: number): void {
  patchLighting({ key: { shadowSoftness } });
}

export function setFillShadowSoftness(shadowSoftness: number): void {
  patchLighting({ fill: { shadowSoftness } });
}

export function setFillColor(rgb: Rgb): void {
  patchLighting({ fill: { color: rgb } });
}

export function setFillIntensityRatio(intensityRatio: number): void {
  patchLighting({ fill: { intensityRatio } });
}

export function setFillDistance(distance: number): void {
  patchLighting({ fill: { distance } });
}

export function setFillCastShadow(castShadow: boolean): void {
  patchLighting({ fill: { castShadow } });
}

export function setFillEnabled(enabled: boolean): void {
  patchLighting({ fill: { enabled } });
  if (!enabled && state.selectedEntityId === 'light-fill') {
    setSelectedEntity(null);
  }
}

export function setSkyEnabled(enabled: boolean): void {
  state = { ...state, skyEnabled: enabled };
  sceneApi?.setSkyEnabled(enabled);
  emit();
}

export function setSkyHorizonColor(rgb: Rgb): void {
  state = { ...state, skyHorizonColor: { ...rgb } };
  sceneApi?.setSkyHorizonColor(rgb);
  emit();
}

export function setSkyZenithColor(rgb: Rgb): void {
  state = { ...state, skyZenithColor: { ...rgb } };
  sceneApi?.setSkyZenithColor(rgb);
  emit();
}

export function setSkyGradientFade(fade: number): void {
  state = { ...state, skyGradientFade: fade };
  sceneApi?.setSkyGradientFade(fade);
  emit();
}

export function setGroundMaterialId(materialId: string): void {
  patchGround({ materialId: migrateMaterialId(materialId) });
}

export function setGroundVisible(visible: boolean): void {
  patchGround({ visible });
}

export function setGroundReceiveShadow(receiveShadow: boolean): void {
  patchGround({ receiveShadow });
}

export function setGroundMirrorEnabled(mirrorEnabled: boolean): void {
  patchGround({ mirrorEnabled });
}

export function setGroundMirrorOpacity(mirrorOpacity: number): void {
  patchGround({ mirrorOpacity });
}

export function setFogEnabled(enabled: boolean): void {
  state = { ...state, fogEnabled: enabled };
  sceneApi?.setFogEnabled(enabled);
  emit();
}

export function setFogColor(rgb: Rgb): void {
  state = { ...state, fogColor: { ...rgb } };
  sceneApi?.setFogColor(rgb);
  emit();
}

export function setFogDistances(near: number, far: number): void {
  state = { ...state, fogNear: near, fogFar: far };
  sceneApi?.setFogDistances(near, far);
  emit();
}

export function setReflectionEnabled(enabled: boolean): void {
  state = { ...state, reflectionEnabled: enabled };
  sceneApi?.setReflectionEnabled(enabled);
  emit();
}

export function setReflectionIntensity(intensity: number): void {
  state = { ...state, reflectionIntensity: intensity };
  sceneApi?.setReflectionIntensity(intensity);
  emit();
}

function refreshCameraState(): void {
  syncCameraFromEngine();
  emit();
}

export function loadBuiltinView(id: BuiltinCameraViewId): void {
  sceneApi?.loadBuiltinView(id);
  refreshCameraState();
}

export function captureSlot(index: CameraSlotIndex): void {
  sceneApi?.captureSlot(index);
  refreshCameraState();
}

export function loadSlot(index: CameraSlotIndex): void {
  sceneApi?.loadSlot(index);
  refreshCameraState();
}

export function clearSlot(index: CameraSlotIndex): void {
  sceneApi?.clearSlot(index);
  refreshCameraState();
}

export function renameSlot(index: CameraSlotIndex, name: string): void {
  sceneApi?.renameSlot(index, name);
  refreshCameraState();
}

export function setCameraProjection(projection: CameraProjection): void {
  sceneApi?.setCameraProjection(projection);
  refreshCameraState();
}

export function setCameraFov(fov: number): void {
  sceneApi?.setCameraFov(fov);
  refreshCameraState();
}

export function setCameraOrthoZoom(zoom: number): void {
  sceneApi?.setCameraOrthoZoom(zoom);
  refreshCameraState();
}

export function getCameraReadoutSnapshot(): CameraReadout | null {
  return sceneApi?.getCameraReadout() ?? null;
}

export function setCameraPosition(partial: Partial<Vec3>): void {
  sceneApi?.setCameraPosition(partial);
}

export function setCameraTarget(partial: Partial<Vec3>): void {
  sceneApi?.setCameraTarget(partial);
}

export function setCameraDistance(distanceM: number): void {
  sceneApi?.setCameraDistance(distanceM);
}

export function setCameraAzimuthDeg(degrees: number): void {
  sceneApi?.setCameraAzimuthDeg(degrees);
}

export function setCameraElevationDeg(degrees: number): void {
  sceneApi?.setCameraElevationDeg(degrees);
}

export function resetCameraAzimuth(): void {
  sceneApi?.resetCameraAzimuth();
}

export function resetCameraElevation(): void {
  sceneApi?.resetCameraElevation();
}

function getEnvironmentPresetById(id: string): EnvironmentPreset | undefined {
  return (
    state.environments.find((entry) => entry.id === id) ??
    resolveBuiltinEnvironmentPreset(id)
  );
}

function nextEnvironmentSaveName(): string {
  const base = 'My environment';
  const names = new Set(
    state.environments
      .filter((entry) => entry.source === 'user')
      .map((entry) => entry.name),
  );
  if (!names.has(base)) return base;
  let index = 2;
  while (names.has(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
}

export function loadEnvironment(id: string): void {
  const preset = getEnvironmentPresetById(id);
  if (!preset) return;
  applyAtmosphereToStateAndScene(
    cloneAtmosphereSnapshot(preset.snapshot),
    id,
  );
}

export function saveCurrentAsEnvironment(): string {
  const id = `user-env-${crypto.randomUUID()}`;
  const preset: EnvironmentPreset = {
    id,
    name: nextEnvironmentSaveName(),
    source: 'user',
    createdAt: new Date().toISOString(),
    snapshot: captureAtmosphereFromState(),
  };

  state = {
    ...state,
    environments: [...state.environments, preset],
    activeEnvironmentId: id,
  };
  emit();
  return id;
}

export function updateEnvironment(
  id: string,
  partial: Pick<EnvironmentPreset, 'name'>,
): void {
  const index = state.environments.findIndex((entry) => entry.id === id);
  if (index < 0) return;
  const current = state.environments[index];
  if (current.source !== 'user') return;

  const environments = [...state.environments];
  environments[index] = { ...current, ...partial };
  state = { ...state, environments };
  emit();
}

export function duplicateEnvironment(id: string): string | null {
  const source =
    getEnvironmentPresetById(id) ??
    state.environments.find((entry) => entry.id === id);
  if (!source) return null;

  const newId = `user-env-${crypto.randomUUID()}`;
  const copy: EnvironmentPreset = {
    ...cloneEnvironmentPreset(source),
    id: newId,
    name: `${source.name} copy`,
    source: 'user',
    description: undefined,
    createdAt: new Date().toISOString(),
  };

  state = {
    ...state,
    environments: [...state.environments, copy],
    activeEnvironmentId: newId,
  };
  applyAtmosphereToStateAndScene(cloneAtmosphereSnapshot(copy.snapshot), newId);
  return newId;
}

export function removeEnvironment(id: string): void {
  const preset = state.environments.find((entry) => entry.id === id);
  if (!preset || preset.source !== 'user') return;

  const wasActive = state.activeEnvironmentId === id;
  state = {
    ...state,
    environments: state.environments.filter((entry) => entry.id !== id),
    activeEnvironmentId: wasActive ? BUILTIN_ENV_DEFAULT_ID : state.activeEnvironmentId,
  };

  if (wasActive) {
    loadEnvironment(BUILTIN_ENV_DEFAULT_ID);
  } else {
    emit();
  }
}

function applyLightingToStateAndScene(
  snapshot: LightingSettings,
  activeLightingPresetId?: string,
): void {
  const lighting = cloneLightingSettings(snapshot);
  state = {
    ...state,
    lighting,
    ...(activeLightingPresetId !== undefined
      ? { activeLightingPresetId }
      : {}),
  };
  sceneApi?.applyLighting(lighting);
  emit();
}

function getLightingPresetById(id: string): LightingPreset | undefined {
  return (
    state.lightingPresets.find((entry) => entry.id === id) ??
    resolveBuiltinLightingPreset(id)
  );
}

function nextLightingPresetSaveName(): string {
  const base = 'My light rig';
  const names = new Set(
    state.lightingPresets
      .filter((entry) => entry.source === 'user')
      .map((entry) => entry.name),
  );
  if (!names.has(base)) return base;
  let index = 2;
  while (names.has(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
}

function captureLightingFromState(): LightingSettings {
  if (sceneApi) {
    return cloneLightingSettings(sceneApi.getLighting());
  }
  return cloneLightingSettings(state.lighting);
}

export function loadLightingPreset(id: string): void {
  const preset = getLightingPresetById(id);
  if (!preset) return;
  applyLightingToStateAndScene(
    cloneLightingSettings(preset.snapshot),
    id,
  );
}

export function saveCurrentAsLightingPreset(): string {
  const id = `user-light-${crypto.randomUUID()}`;
  const preset: LightingPreset = {
    id,
    name: nextLightingPresetSaveName(),
    source: 'user',
    createdAt: new Date().toISOString(),
    snapshot: captureLightingFromState(),
  };

  state = {
    ...state,
    lightingPresets: [...state.lightingPresets, preset],
    activeLightingPresetId: id,
  };
  emit();
  return id;
}

export function updateLightingPreset(
  id: string,
  partial: Pick<LightingPreset, 'name'>,
): void {
  const index = state.lightingPresets.findIndex((entry) => entry.id === id);
  if (index < 0) return;
  const current = state.lightingPresets[index];
  if (current.source !== 'user') return;

  const lightingPresets = [...state.lightingPresets];
  lightingPresets[index] = { ...current, ...partial };
  state = { ...state, lightingPresets };
  emit();
}

export function duplicateLightingPreset(id: string): string | null {
  const source = getLightingPresetById(id);
  if (!source) return null;

  const newId = `user-light-${crypto.randomUUID()}`;
  const copy: LightingPreset = {
    ...cloneLightingPreset(source),
    id: newId,
    name: `${source.name} copy`,
    source: 'user',
    description: undefined,
    createdAt: new Date().toISOString(),
  };

  state = {
    ...state,
    lightingPresets: [...state.lightingPresets, copy],
    activeLightingPresetId: newId,
  };
  applyLightingToStateAndScene(cloneLightingSettings(copy.snapshot), newId);
  return newId;
}

export function removeLightingPreset(id: string): void {
  const preset = state.lightingPresets.find((entry) => entry.id === id);
  if (!preset || preset.source !== 'user') return;

  const wasActive = state.activeLightingPresetId === id;
  state = {
    ...state,
    lightingPresets: state.lightingPresets.filter((entry) => entry.id !== id),
    activeLightingPresetId: wasActive
      ? BUILTIN_LIGHT_DEFAULT_ID
      : state.activeLightingPresetId,
  };

  if (wasActive) {
    loadLightingPreset(BUILTIN_LIGHT_DEFAULT_ID);
  } else {
    emit();
  }
}

export function setExportImageFormat(format: ExportImageFormat): void {
  if (state.exportImageFormat === format) return;
  state = { ...state, exportImageFormat: format };
  emit();
}

export function setExportGroundSurface(surface: ExportGroundSurface): void {
  if (state.exportGroundSurface === surface) return;
  state = { ...state, exportGroundSurface: surface };
  emit();
}

export function setExportHideLightFixtures(hide: boolean): void {
  if (state.exportHideLightFixtures === hide) return;
  state = { ...state, exportHideLightFixtures: hide };
  emit();
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Viewport raster export — same RenderPipeline + SMAA chain as the live view. */
export async function exportViewportImage(): Promise<void> {
  if (!sceneApi) {
    console.warn('[export] Scene is not ready.');
    return;
  }

  const format = state.exportImageFormat;
  const groundSurface =
    format === 'png-transparent' ? state.exportGroundSurface : 'viewport';
  const blob = await sceneApi.captureViewportImage({
    format,
    groundSurface,
    hideLightFixtures: state.exportHideLightFixtures,
  });
  const filename = viewportExportDownloadFilename(format);
  triggerBlobDownload(blob, filename);
}

export type { ExportGroundSurface, ExportImageFormat } from '@/scene/export-image';
