import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { STARTER_IMAGES, type ImageAsset } from '@/data/image-assets';
import type { Rgb } from '@/colors/rgb';
import { cloneColorPreset, COLOR_PRESETS } from '@/data/color-presets';
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
import { cloneMaterialPreset, MATERIAL_PRESETS } from '@/data/material-presets';
import { applyAtmosphereSnapshot } from '@/scene/atmosphere-snapshot';
import {
  cloneAtmosphereSnapshot,
  type AtmosphereSnapshot,
  type EnvironmentPreset,
} from '@/scene/environment-preset-types';
import { defaultExportSizeSettings, type ExportSizeSettings } from '@/scene/export-size';
import { normalizeGroundSettings } from '@/scene/ground-settings';
import {
  cloneLightingSettings,
  type LightingPreset,
} from '@/scene/lighting-preset-types';
import { mergeLightingSettings } from '@/scene/lighting-merge';
import type { ColorPreset } from '@/scene/color-types';
import type {
  ExportGroundSurface,
  ExportImageFormat,
} from '@/scene/export-image';
import type { AssetEntity, MaterialPreset } from '@/scene/entity-types';
import type { UserBakedAsset } from '@/scene/user-baked-asset';
import { migrateMaterialId } from '@/scene/material-ids';
import {
  clonePhysicsSettings,
  defaultPhysicsSettings,
  mergePhysicsSettings,
  type EditablePhysicsSettings,
  type PhysicsSettings,
} from '@/scene/physics-settings';
import type { PatchHandleSelection } from '@/scene/asset-triangle-patch';
import type {
  AppMode,
  CameraSettings,
  CameraSlot,
  DeepPartial,
  EnvironmentState,
  GroundSettings,
  LightingSettings,
  ReflectionSource,
  SceneApi,
  ViewportHelpersState,
} from '@/scene/scene-api';


export interface AppState {
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
  reflectionSource: ReflectionSource;
  images: ImageAsset[];
  selectedImageId: string | null;
  materials: MaterialPreset[];
  selectedMaterialId: string | null;
  colors: ColorPreset[];
  selectedColorId: string | null;
  environments: EnvironmentPreset[];
  activeEnvironmentId: string;
  lightingPresets: LightingPreset[];
  activeLightingPresetId: string;
  entities: readonly AssetEntity[];
  userBakedAssets: UserBakedAsset[];
  selectedEntityId: string | null;
  patchHandleSelection: PatchHandleSelection | null;
  /** Patch whose viewport add-point mode is running, if any. */
  patchAddPointEntityId: string | null;
  camera: CameraSettings;
  exportImageFormat: ExportImageFormat;
  exportGroundSurface: ExportGroundSurface;
  exportSize: ExportSizeSettings;
  /** Live canvas size in device pixels (drives the `viewport` export preset). */
  viewportPixelSize: { width: number; height: number };
  viewportHelpers: ViewportHelpersState;
  physics: PhysicsSettings;
}


const listeners = new Set<() => void>();
export let sceneApi: SceneApi | null = null;
export let engineUnsubscribe: (() => void) | null = null;

const { environment, ground, lighting, camera, viewportHelpers } = SCENE_DEFAULTS;

export let state: AppState = {
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
  reflectionSource: environment.reflectionSource,
  images: [...STARTER_IMAGES],
  selectedImageId: null,
  materials: MATERIAL_PRESETS.map(cloneMaterialPreset),
  selectedMaterialId: null,
  colors: COLOR_PRESETS.map(cloneColorPreset),
  selectedColorId: null,
  environments: ENVIRONMENT_PRESETS.map(cloneEnvironmentPreset),
  activeEnvironmentId: BUILTIN_ENV_DEFAULT_ID,
  lightingPresets: LIGHTING_PRESETS.map(cloneLightingPreset),
  activeLightingPresetId: BUILTIN_LIGHT_DEFAULT_ID,
  entities: [],
  userBakedAssets: [],
  selectedEntityId: null,
  patchHandleSelection: null,
  patchAddPointEntityId: null,
  camera: cloneCameraSettings(camera.settings),
  exportImageFormat: 'png-transparent',
  exportGroundSurface: 'viewport',
  exportSize: defaultExportSizeSettings(),
  viewportPixelSize: { width: 0, height: 0 },
  viewportHelpers: { ...viewportHelpers },
  physics: defaultPhysicsSettings(),
};

const MATERIAL_UPDATE_DEBOUNCE_MS = 75;
let materialUpdateTimer: ReturnType<typeof setTimeout> | null = null;
const pendingMaterialInvalidations = new Set<string>();


export function emit(): void {
  listeners.forEach((listener) => { listener(); });
}

export function cloneGround(settings: GroundSettings): GroundSettings {
  return normalizeGroundSettings(settings);
}

export function cloneCameraSlot(slot: CameraSlot): CameraSlot {
  if (!slot) {return null;}
  return {
    ...slot,
    position: { ...slot.position },
    target: { ...slot.target },
  };
}

export function cloneCameraSettings(settings: CameraSettings): CameraSettings {
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

export function getEnvironmentState(): EnvironmentState {
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
    reflectionSource: state.reflectionSource,
  };
}

export function captureAtmosphereFromState(): AtmosphereSnapshot {
  return cloneAtmosphereSnapshot({
    environment: getEnvironmentState(),
    ground: cloneGround(state.ground),
    lighting: cloneLightingSettings(state.lighting),
  });
}

export function applyAtmosphereToStateAndScene(
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
    reflectionSource: environment.reflectionSource,
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

export function syncEnvironmentToScene(): void {
  sceneApi?.applyEnvironment(getEnvironmentState());
}

export function syncGroundToScene(): void {
  sceneApi?.applyGround(state.ground);
}

export function syncLightingToScene(): void {
  sceneApi?.applyLighting(state.lighting);
}

export function syncCameraFromEngine(): void {
  if (!sceneApi) {return;}
  state = {
    ...state,
    camera: cloneCameraSettings(sceneApi.getCameraSettings()),
  };
}

export function syncEngineStateFromEngine(): void {
  if (!sceneApi) {return;}
  state = {
    ...state,
    lighting: cloneLightingSettings(sceneApi.getLighting()),
    physics: {
      ...clonePhysicsSettings(sceneApi.getPhysicsSettings()),
      lastFabricClothBakeSummary: state.physics.lastFabricClothBakeSummary,
    },
    entities: sceneApi.getEntities(),
    selectedEntityId: sceneApi.getSelectedEntityId(),
    patchHandleSelection: sceneApi.getPatchHandleSelection(),
    patchAddPointEntityId: sceneApi.getPatchAddPointEntityId(),
    camera: cloneCameraSettings(sceneApi.getCameraSettings()),
  };
  emit();
}

export function patchLighting(partial: DeepPartial<LightingSettings>): void {
  const nextLighting = mergeLightingSettings(state.lighting, partial);
  state = { ...state, lighting: nextLighting };
  sceneApi?.setLighting(partial);
  emit();
}

export function patchViewportHelpers(partial: Partial<ViewportHelpersState>): void {
  const next = { ...state.viewportHelpers, ...partial };
  state = { ...state, viewportHelpers: next };
  sceneApi?.setViewportHelpers(partial);
  emit();
}

export function patchPhysics(partial: Partial<EditablePhysicsSettings>): void {
  const nextPhysics = mergePhysicsSettings(state.physics, partial);
  state = { ...state, physics: nextPhysics };
  sceneApi?.setPhysicsSettings(partial);
  emit();
}

export function patchGround(partial: Partial<GroundSettings>): void {
  const nextGround = cloneGround({
    ...state.ground,
    ...partial,
  });
  state = { ...state, ground: nextGround };
  sceneApi?.setGround(partial);
  emit();
}

export function getImageById(imageId: string): ImageAsset | undefined {
  return state.images.find((image) => image.id === imageId);
}

export function getMaterialById(materialId: string): MaterialPreset | undefined {
  const resolvedId = migrateMaterialId(materialId);
  return state.materials.find((material) => material.id === resolvedId);
}

export function scheduleMaterialInvalidation(materialId: string): void {
  pendingMaterialInvalidations.add(materialId);
  if (materialUpdateTimer) {clearTimeout(materialUpdateTimer);}
  materialUpdateTimer = setTimeout(() => {
    materialUpdateTimer = null;
    const ids = [...pendingMaterialInvalidations];
    pendingMaterialInvalidations.clear();
    for (const id of ids) {
      sceneApi?.invalidateMaterial(id);
    }
  }, MATERIAL_UPDATE_DEBOUNCE_MS);
}

export function refreshCameraState(): void {
  syncCameraFromEngine();
  emit();
}

export function getEnvironmentPresetById(id: string): EnvironmentPreset | undefined {
  return (
    state.environments.find((entry) => entry.id === id) ??
    resolveBuiltinEnvironmentPreset(id)
  );
}

export function nextEnvironmentSaveName(): string {
  const base = 'My environment';
  const names = new Set(
    state.environments
      .filter((entry) => entry.source === 'user')
      .map((entry) => entry.name),
  );
  if (!names.has(base)) {return base;}
  let index = 2;
  while (names.has(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
}

export function applyLightingToStateAndScene(
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

export function getLightingPresetById(id: string): LightingPreset | undefined {
  return (
    state.lightingPresets.find((entry) => entry.id === id) ??
    resolveBuiltinLightingPreset(id)
  );
}

export function nextLightingPresetSaveName(): string {
  const base = 'My light rig';
  const names = new Set(
    state.lightingPresets
      .filter((entry) => entry.source === 'user')
      .map((entry) => entry.name),
  );
  if (!names.has(base)) {return base;}
  let index = 2;
  while (names.has(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
}

export function captureLightingFromState(): LightingSettings {
  if (sceneApi) {
    return cloneLightingSettings(sceneApi.getLighting());
  }
  return cloneLightingSettings(state.lighting);
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

export function setAppState(next: AppState): void {
  state = next;
}

export function setSceneApiRef(api: SceneApi | null): void {
  sceneApi = api;
}

export function setEngineUnsubscribeRef(
  unsubscribe: (() => void) | null,
): void {
  engineUnsubscribe = unsubscribe;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

