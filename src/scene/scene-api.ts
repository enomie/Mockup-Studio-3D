import type { KindParamFamily, KindParamsByFamily } from './kind-param-families';
import type { Rgb } from '@/colors/rgb';
import type {
  AssetEntity,
  AssetFaceContent,
  AssetFaceId,
  AssetGeometryPart,
  AssetKind,
  EntityTransform,
  PatchHandleSelection,
  PatchHandleTarget,
  WallpaperPattern,
  ImageResolver,
  MaterialEntitySlot,
  Vec3,
} from './entity-types';
import type { AssetImageSurfaceId, ImageSurfaceSettings } from './image-surface';
import type { AtmosphereSnapshot } from './environment-preset-types';
import type { CaptureViewportImageOptions } from './export-image';
import type { MaterialPresetResolver } from './material-types';
import type { EditablePhysicsSettings, PhysicsSettings } from './physics-settings';
import type { PhysicsBodyMode } from './physics-rigid-body';
import type { BookMaterialTintPart } from './book-material-tints';
import type {
  BakeFabricClothDraft,
  UserBakedAsset,
  UserBakedAssetResolver,
} from './user-baked-asset';

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

export interface EnvironmentState {
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
}

export interface GroundSettings {
  visible: boolean;
  materialId: string;
  receiveShadow: boolean;
  mirrorEnabled: boolean;
  mirrorOpacity: number;
}

export interface ViewportHelpersState {
  floorGrid: boolean;
  worldOrigin: boolean;
  forwardArrow: boolean;
  lightHandles: boolean;
}

export type LightingReferenceMode = 'scene-center' | 'world-fixed';

export type StudioLightSide = 'left' | 'right';

export interface AmbientLightSettings {
  enabled: boolean;
  color: Rgb;
  intensity: number;
}

export interface KeyLightSettings {
  enabled: boolean;
  side: StudioLightSide;
  color: Rgb;
  intensity: number;
  castShadow: boolean;
  /** PCF penumbra — maps to light.shadow.radius (0 = hard, 30 = very soft). */
  shadowSoftness: number;
  transformOffset: EntityTransform;
}

export interface FillLightSettings {
  enabled: boolean;
  color: Rgb;
  intensityRatio: number;
  distance: number;
  castShadow: boolean;
  /** PCF penumbra — maps to light.shadow.radius (0 = hard, 30 = very soft). */
  shadowSoftness: number;
  transformOffset: EntityTransform;
}

export interface LightingSettings {
  referenceMode: LightingReferenceMode;
  showFixtures: boolean;
  fixturesReflectInMirror: boolean;
  ambient: AmbientLightSettings;
  key: KeyLightSettings;
  fill: FillLightSettings;
}

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

export interface CameraViewState {
  projection: CameraProjection;
  position: Vec3;
  target: Vec3;
  fov: number;
  orthoZoom: number;
}

export type CameraSlotData = CameraViewState & { name: string };

export type CameraSlot = CameraSlotData | null;

export interface CameraSettings {
  projection: CameraProjection;
  fov: number;
  orthoZoom: number;
  slots: [CameraSlot, CameraSlot, CameraSlot];
}

/** Live navigation readout — position, orbit target, distance and orbit angles. */
export interface CameraReadout {
  position: Vec3;
  target: Vec3;
  distance: number;
  azimuthDeg: number;
  elevationDeg: number;
}

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
  getPhysicsSettings(): PhysicsSettings;
  setPhysicsSettings(partial: Partial<EditablePhysicsSettings>): void;
  startPhysicsRigidTest(): void;
  stopPhysicsRigidTest(): void;
  startWorldPhysics(): void;
  toggleWorldPhysicsPause(): void;
  resetWorldPhysics(): void;
  applyEnvironment(state: EnvironmentState): void;
  applyAtmosphereSnapshot(snapshot: AtmosphereSnapshot): void;
  setEnvironment(partial: Partial<EnvironmentState>): void;
  applyGround(state: GroundSettings): void;
  setGround(partial: Partial<GroundSettings>): void;
  applyViewportHelpers(state: ViewportHelpersState): void;
  setViewportHelpers(partial: Partial<ViewportHelpersState>): void;
  getViewportHelpers(): ViewportHelpersState;
  addAsset(assetKind: AssetKind): string;
  setUserBakedAssetResolver(resolver: UserBakedAssetResolver | null): void;
  canBakeSelectedEntity(): boolean;
  buildBakeFabricClothDraft(entityId: string): BakeFabricClothDraft | null;
  addAssetFromUserBaked(userAsset: UserBakedAsset, spawn?: { x: number; z: number }): string;
  removeEntity(entityId: string): void;
  selectEntity(entityId: string | null): void;
  getSelectedEntityId(): string | null;
  getEntities(): readonly AssetEntity[];
  setEntityTransform(entityId: string, partial: Partial<EntityTransform>): void;
  setAssetImage(entityId: string, imageId: string | null): void;
  releaseImageTexture(imageId: string): void;
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
  setWallpaperPattern(entityId: string, partial: Partial<WallpaperPattern>): void;
  /** Merges a param patch for the entity's kind family and rebuilds it. Ignored for other kinds. */
  setKindParams<F extends KindParamFamily>(
    family: F,
    entityId: string,
    partial: Partial<KindParamsByFamily[F]>,
  ): void;
  setPhysicsBodyMode(entityId: string, mode: PhysicsBodyMode): void;
  setPhysicsDensityKgPerM3(entityId: string, densityKgPerM3: number): void;
  /** Border, `physics` (Verlet tuning), `sim` (pins, restPose) — partial merge with clamp. */
  /** Ephemeral UI state — active pin corner 0–3 for gizmo during world physics. */
  setFabricClothActivePinCorner(entityId: string, cornerIndex: number): void;
  getFabricClothActivePinCorner(entityId: string): number;
  setBookBackCoverImageId(entityId: string, imageId: string | null): void;
  setBookSpineImageId(entityId: string, imageId: string | null): void;
  setBookMaterialTint(entityId: string, part: BookMaterialTintPart, tint: Rgb): void;
  selectPatchHandle(entityId: string, pointId: string, targetKey: PatchHandleTarget): void;
  getPatchHandleSelection(): PatchHandleSelection | null;
  /** Starts the viewport add-point mode for a triangle patch, or stops it with null. */
  setPatchAddPointMode(entityId: string | null): void;
  getPatchAddPointEntityId(): string | null;
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
