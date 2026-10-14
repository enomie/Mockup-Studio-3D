import { DEFAULT_SIZE_SCALE } from '@/constants';
import type { AssetFaces } from './asset-faces';
import type { HandheldDeviceParams } from './asset-handheld';
import type { MonitorDeviceParams } from './asset-monitor';
import type { PrintDeviceParams } from './asset-print';
import type { BeverageCanParams } from './asset-beverage-can';
import type { TinCanParams } from './asset-tin-can';
import type { WineBottleParams } from './asset-wine-bottle';
import type { PenParams } from './asset-pen';
import type { BlockParams } from './asset-block';
import type { CylinderParams } from './asset-cylinder';
import type { SphereParams } from './asset-sphere';
import type { WheelCarParams } from './asset-wheel-car';
import type { FabricClothParams } from './asset-fabric-cloth';
import type { BookParams } from './asset-book';
import type { PhysicsBodyMode } from './physics-rigid-body';
import type { WallParams, WallpaperPattern } from './asset-wall';
import type { AssetKind } from './asset-kind';
import type { AssetGeometryVisibility } from './geometry-visibility';
import type { AssetImageSurfaceId, ImageSurfaceSettings } from './image-surface';
import type { AssetMaterialSlots } from './material-types';

export interface Vec3 { x: number; y: number; z: number }

export type { AssetKind } from './asset-kind';
export type { AssetFaceId, AssetFaceContent, AssetFaces } from './asset-faces';
export type {
  AssetImageSurfaceId,
  ImageSurfaceFinish,
  ImageSurfaceSettings,
} from './image-surface';
export type { HandheldDeviceParams } from './asset-handheld';
export type { MonitorDeviceParams } from './asset-monitor';
export type { PrintDeviceParams } from './asset-print';
export type { BeverageCanParams } from './asset-beverage-can';
export type { TinCanParams } from './asset-tin-can';
export type { WineBottleParams } from './asset-wine-bottle';
export type { PenParams } from './asset-pen';
export type { BlockParams } from './asset-block';
export type { CylinderParams } from './asset-cylinder';
export type { SphereParams } from './asset-sphere';
export type { WheelCarParams } from './asset-wheel-car';
export type { FabricClothParams } from './asset-fabric-cloth';
export type { BookParams } from './asset-book';
export type { PhysicsBodyMode } from './physics-rigid-body';
export type { WallParams, WallpaperPattern } from './asset-wall';

export interface EntityTransform {
  position: Vec3;
  /** Euler angles in radians (XYZ order). */
  rotation: Vec3;
}

export interface AssetEntity {
  id: string;
  type: 'asset';
  name: string;
  assetKind: AssetKind;
  /** Primary screen image — synced with `faces.front` on print assets. */
  screenImageId: string | null;
  /** Per-face content — print (6-sided prism). */
  faces?: AssetFaces;
  /** Prism depth in meters; independent of front image. */
  depth?: number;
  /** Uniform size multiplier — front reference edge × sizeScale; aspect from image. */
  sizeScale: number;
  /** Per-slot material preset references. */
  materials?: AssetMaterialSlots;
  /** Per-face image surface finish + emissive (image faces only). */
  imageSurfaces?: Partial<Record<AssetImageSurfaceId, ImageSurfaceSettings>>;
  /** Per-part mesh visibility (picture / handheld). */
  geometryVisibility?: AssetGeometryVisibility;
  /** Device geometry params (handheld / monitor). */
  params?: HandheldDeviceParams | MonitorDeviceParams;
  /** Print geometry params. */
  printParams?: PrintDeviceParams;
  /** Wall dimensions (wall / wall-door). */
  wallParams?: WallParams;
  /** Wallpaper repeat strip size (wall / wall-door). */
  wallpaperPattern?: WallpaperPattern;
  /** Block dimensions (block). */
  blockParams?: BlockParams;
  cylinderParams?: CylinderParams;
  sphereParams?: SphereParams;
  wheelCarParams?: WheelCarParams;
  beverageCanParams?: BeverageCanParams;
  tinCanParams?: TinCanParams;
  wineBottleParams?: WineBottleParams;
  penParams?: PenParams;
  fabricClothParams?: FabricClothParams;
  bookParams?: BookParams;
  bookBackCoverImageId?: string | null;
  bookSpineImageId?: string | null;
  /** Rapier fixed vs dynamic (rigid props). Default dynamic when omitted. */
  physicsBodyMode?: PhysicsBodyMode;
  /** kg/m³ for rigid mass from volume. Default 1000 when omitted. */
  physicsDensityKgPerM3?: number;
  /** Render visibility — false hides the object in the viewport. */
  visible: boolean;
  transform: EntityTransform;
}

export { DEFAULT_SIZE_SCALE };

export type { AssetGeometryPart, AssetGeometryVisibility } from './geometry-visibility';
export type { AssetMaterialSlots, MaterialEntitySlot, MaterialPreset } from './material-types';

export interface ImageMeta {
  url: string;
  width: number;
  height: number;
  name?: string;
}

export type ImageResolver = (imageId: string) => ImageMeta | null;

export const PLACEHOLDER_ASPECT = 16 / 9;

export function defaultTransform(): EntityTransform {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  };
}

export function cloneTransform(transform: EntityTransform): EntityTransform {
  return {
    position: { ...transform.position },
    rotation: { ...transform.rotation },
  };
}
