import type { Texture } from 'three/webgpu';
import type { AssetFaceId, AssetFaces } from '@/scene/asset-faces';
import type { BeverageCanParams } from '@/scene/asset-beverage-can';
import type { BlockParams } from '@/scene/asset-block';
import type { HandheldDeviceParams } from '@/scene/asset-handheld';
import type { MonitorDeviceParams } from '@/scene/asset-monitor';
import type { PrintDeviceParams } from '@/scene/asset-print';
import type { TinCanParams } from '@/scene/asset-tin-can';
import type { WineBottleParams } from '@/scene/asset-wine-bottle';
import type { WallParams, WallpaperPattern } from '@/scene/asset-wall';
import type {
  AssetImageSurfaceId,
  AssetKind,
} from '@/scene/entity-types';
import type { AssetGeometryVisibility } from '@/scene/geometry-visibility';
import type { ImageSurfaceSettings } from '@/scene/image-surface';
import type { AssetMaterialSlots } from '@/scene/material-types';
import type { MaterialResolver } from '@/engine/material-resolver';

export type ImageSize = {
  width: number;
  height: number;
};

export type AssetBuildContext = {
  imageWidth?: number;
  imageHeight?: number;
  imageTexture?: Texture | null;
  faces?: AssetFaces;
  faceTextures?: Partial<Record<AssetFaceId, Texture | null>>;
  faceImageSizes?: Partial<Record<AssetFaceId, ImageSize | null>>;
  faceWidth?: number;
  faceHeight?: number;
  depth?: number;
  sizeScale?: number;
  materials?: AssetMaterialSlots;
  geometryVisibility?: AssetGeometryVisibility;
  materialResolver?: MaterialResolver;
  handheldParams?: HandheldDeviceParams;
  monitorParams?: MonitorDeviceParams;
  printParams?: PrintDeviceParams;
  wallParams?: WallParams;
  wallpaperPattern?: WallpaperPattern;
  blockParams?: BlockParams;
  beverageCanParams?: BeverageCanParams;
  tinCanParams?: TinCanParams;
  wineBottleParams?: WineBottleParams;
  assetKind?: AssetKind;
  imageSurfaces?: Partial<Record<AssetImageSurfaceId, ImageSurfaceSettings>>;
};
