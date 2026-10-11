import type { Rgb } from '@/colors/rgb';
import type {
  AssetEntity,
  AssetFaceContent,
  AssetFaceId,
  AssetGeometryPart,
  AssetKind,
  EntityTransform,
  HandheldDeviceParams,
  MonitorDeviceParams,
  BeverageCanParams,
  TinCanParams,
  WineBottleParams,
  BlockParams,
  PrintDeviceParams,
  WallParams,
  WallpaperPattern,
  ImageResolver,
  MaterialEntitySlot,
  Vec3,
} from './entity-types';
import type { AssetImageSurfaceId, ImageSurfaceSettings } from './image-surface';
import type { AtmosphereSnapshot } from './environment-preset-types';
import type { CaptureViewportImageOptions } from './export-image';
import type { MaterialPresetResolver } from './material-types';

export type {
  AssetEntity,
  AssetFaceContent,
  AssetFaceId,
  AssetGeometryPart,
  AssetKind,
  EntityTransform,
  ImageResolver,
  MaterialEntitySlot,
} from './entity-types';

export type AppMode = 'select' | 'translate' | 'rotate' | 'scale' | 'place-texture' | 'export';

export type EnvironmentState = {
  skyEnabled: boolean;
  skyHorizonColor: Rgb;
  skyZenithColor: Rgb;
  skyGradientFade: number;
  fogEnabled: boolean;
  fogColor: Rgb;
  fogNear: number;
  fogFar: number;
  reflectionEnabled: boolean;
  reflectionIntensity: number;
};

export type GroundSettings = {
  visible: boolean;
  materialId: string;
  receiveShadow: boolean;
  mirrorEnabled: boolean;
  mirrorOpacity: number;
};

export type LightingReferenceMode = 'scene-center' | 'world-fixed';

export type StudioLightSide = 'left' | 'right';

export type AmbientLightSettings = {
  enabled: boolean;
  color: Rgb;
  intensity: number;
};

export type KeyLightSettings = {
  enabled: boolean;
  side: StudioLightSide;
  color: Rgb;
  intensity: number;
  castShadow: boolean;
  /** PCF penumbra — maps to light.shadow.radius (0 = hard, 30 = very soft). */
  shadowSoftness: number;
  transformOffset: EntityTransform;
};

export type FillLightSettings = {
  enabled: boolean;
  color: Rgb;
  intensityRatio: number;
  distance: number;
  castShadow: boolean;
  /** PCF penumbra — maps to light.shadow.radius (0 = hard, 30 = very soft). */
  shadowSoftness: number;
  transformOffset: EntityTransform;
};

export type LightingSettings = {
  referenceMode: LightingReferenceMode;
  ambient: AmbientLightSettings;
  key: KeyLightSettings;
  fill: FillLightSettings;
};

export type CameraProjection = 'perspective' | 'orthographic';

export type BuiltinCameraViewId =
  | 'normal'
  | 'front'
  | 'top'
  | 'back'
  | 'bottom'
  | 'left'
  | 'right';

export type CameraSlotIndex = 1 | 2 | 3;

export type CameraViewState = {
  projection: CameraProjection;
  position: Vec3;
  target: Vec3;
  fov: number;
  orthoZoom: number;
};

export type CameraSlotData = CameraViewState & { name: string };

export type CameraSlot = CameraSlotData | null;

export type CameraSettings = {
  projection: CameraProjection;
  fov: number;
  orthoZoom: number;
  slots: [CameraSlot, CameraSlot, CameraSlot];
};

/** Live navigation readout — position, orbit target, distance and orbit angles. */
export type CameraReadout = {
  position: Vec3;
  target: Vec3;
  distance: number;
  azimuthDeg: number;
  elevationDeg: number;
};

export type SceneApiListener = () => void;

/** Public engine surface — no Three.js types. UI talks only through this. */
export interface SceneApi {
  dispose(): void;
  subscribe(listener: SceneApiListener): () => void;
  setImageResolver(resolver: ImageResolver | null): void;
  setMaterialPresetResolver(resolver: MaterialPresetResolver | null): void;
  invalidateMaterial(materialId: string): void;
  setMode(mode: AppMode): void;
  applyLighting(state: LightingSettings): void;
  setLighting(partial: DeepPartial<LightingSettings>): void;
  getLighting(): LightingSettings;
  applyEnvironment(state: EnvironmentState): void;
  applyAtmosphereSnapshot(snapshot: AtmosphereSnapshot): void;
  applyGround(state: GroundSettings): void;
  setGround(partial: Partial<GroundSettings>): void;
  setSkyEnabled(enabled: boolean): void;
  setSkyHorizonColor(rgb: Rgb): void;
  setSkyZenithColor(rgb: Rgb): void;
  setSkyGradientFade(fade: number): void;
  setFogEnabled(enabled: boolean): void;
  setFogColor(rgb: Rgb): void;
  setFogDistances(near: number, far: number): void;
  setReflectionEnabled(enabled: boolean): void;
  setReflectionIntensity(intensity: number): void;
  addAsset(assetKind: AssetKind): string;
  removeEntity(entityId: string): void;
  selectEntity(entityId: string | null): void;
  getSelectedEntityId(): string | null;
  getEntities(): readonly AssetEntity[];
  setEntityTransform(entityId: string, partial: Partial<EntityTransform>): void;
  setAssetImage(entityId: string, imageId: string | null): void;
  setAssetFace(entityId: string, faceId: AssetFaceId, content: AssetFaceContent): void;
  setAssetDepth(entityId: string, depthM: number): void;
  setAssetSizeScale(entityId: string, sizeScale: number): void;
  setEntityVisible(entityId: string, visible: boolean): void;
  setEntityMaterial(
    entityId: string,
    slot: MaterialEntitySlot,
    materialId: string,
  ): void;
  setFaceTint(entityId: string, faceId: AssetFaceId, tint: Rgb): void;
  setImageSurface(
    entityId: string,
    faceId: AssetImageSurfaceId,
    partial: Partial<ImageSurfaceSettings>,
  ): void;
  setGeometryVisible(
    entityId: string,
    part: AssetGeometryPart,
    visible: boolean,
  ): void;
  setHandheldParams(entityId: string, partial: Partial<HandheldDeviceParams>): void;
  setMonitorParams(entityId: string, partial: Partial<MonitorDeviceParams>): void;
  setPrintParams(entityId: string, partial: Partial<PrintDeviceParams>): void;
  setWallParams(entityId: string, partial: Partial<WallParams>): void;
  setWallpaperPattern(entityId: string, partial: Partial<WallpaperPattern>): void;
  setBlockParams(entityId: string, partial: Partial<BlockParams>): void;
  setBeverageCanParams(
    entityId: string,
    partial: Partial<BeverageCanParams>,
  ): void;
  setTinCanParams(entityId: string, partial: Partial<TinCanParams>): void;
  setWineBottleParams(
    entityId: string,
    partial: Partial<WineBottleParams>,
  ): void;
  loadBuiltinView(id: BuiltinCameraViewId): void;
  captureSlot(index: CameraSlotIndex): void;
  loadSlot(index: CameraSlotIndex): void;
  clearSlot(index: CameraSlotIndex): void;
  renameSlot(index: CameraSlotIndex, name: string): void;
  setCameraProjection(projection: CameraProjection): void;
  setCameraFov(fov: number): void;
  setCameraOrthoZoom(zoom: number): void;
  getCameraSettings(): CameraSettings;
  getCameraViewState(): CameraViewState;
  getCameraReadout(): CameraReadout;
  setCameraPosition(partial: Partial<Vec3>): void;
  setCameraTarget(partial: Partial<Vec3>): void;
  setCameraDistance(distanceM: number): void;
  setCameraAzimuthDeg(degrees: number): void;
  setCameraElevationDeg(degrees: number): void;
  resetCameraAzimuth(): void;
  resetCameraElevation(): void;
  captureViewportImage(options: CaptureViewportImageOptions): Promise<Blob>;
}

/** Recursive partial for nested lighting settings patches. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
