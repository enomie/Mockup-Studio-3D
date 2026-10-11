import type { ImageAsset } from '@/data/image-assets';
import {
  bezelWidthM,
  HANDHELD_PLACEHOLDER_ASPECT,
  isHandheldAssetKind,
  SMARTPHONE_REF_SCREEN_HEIGHT_M,
  TABLET_REF_SCREEN_HEIGHT_M,
} from './asset-handheld';
import {
  defaultMonitorParams,
  isMonitorAssetKind,
  MONITOR_PLACEHOLDER_ASPECT,
  MONITOR_REF_SCREEN_WIDTH_M,
  monitorStandHeightsM,
  type MonitorDeviceParams,
} from './asset-monitor';
import {
  defaultBeverageCanParams,
  isBeverageCanAssetKind,
} from './asset-beverage-can';
import {
  defaultTinCanParams,
  isTinCanAssetKind,
  tinCanMeshHeightM,
} from './asset-tin-can';
import {
  defaultWineBottleParams,
  isWineBottleAssetKind,
} from './asset-wine-bottle';
import { defaultBlockParams, isBlockAssetKind } from './asset-block';
import {
  computeLabelPrintableBandMm,
  computeLabelUnfoldAspect,
} from '@/engine/beverage-can-label-unfold';
import { computeTinCanLabelUnfoldAspect } from '@/engine/tin-can-label-unfold';
import { defaultWallParams, isWallAssetKind } from './asset-wall';
import {
  getAssetKindFamily,
  usesAsyncPackagingRebuild,
} from './asset-kind-registry';
import type { AssetEntity, AssetKind, ImageResolver } from './entity-types';
import {
  DEFAULT_SIZE_SCALE,
  SIZE_SCALE_MAX,
  SIZE_SCALE_MIN,
} from '@/constants';

const FOOT_WORLD_Y_EPSILON_M = 1e-6;

export type FaceSize = {
  width: number;
  height: number;
};

/** A5 width (148 mm) — portrait default when no front image is assigned. */
const PRINT_REF_WIDTH = 0.148;
const PRINT_PLACEHOLDER_ASPECT = 148 / 210;
/** Opening width for picture framed — 50 cm (real-world default). */
const PICTURE_REF_WIDTH = 0.5;
/** Default portrait opening 50 × 60 cm when no screen image is assigned. */
const PICTURE_PLACEHOLDER_ASPECT = 50 / 60;

const PRINT_DEFAULT_DEPTH = 0.002;
/** Matches `FRAME_THICKNESS` in `asset-meshes/shared.ts` — frame bar width per side. */
const PICTURE_FRAME_THICKNESS_M = 0.018;

export function clampSizeScale(sizeScale: number): number {
  return Math.max(SIZE_SCALE_MIN, Math.min(SIZE_SCALE_MAX, sizeScale));
}

export function defaultDepth(assetKind: AssetKind): number | undefined {
  if (assetKind === 'print') return PRINT_DEFAULT_DEPTH;
  return undefined;
}

export function referenceFaceWidth(assetKind: AssetKind): number {
  switch (assetKind) {
    case 'print':
      return PRINT_REF_WIDTH;
    case 'picture':
      return PICTURE_REF_WIDTH;
    case 'smartphone':
      return SMARTPHONE_REF_SCREEN_HEIGHT_M * HANDHELD_PLACEHOLDER_ASPECT;
    case 'tablet':
      return TABLET_REF_SCREEN_HEIGHT_M * HANDHELD_PLACEHOLDER_ASPECT;
    case 'monitor':
      return MONITOR_REF_SCREEN_WIDTH_M;
    case 'wall':
    case 'wall-door':
      return defaultWallParams().widthM;
    case 'block':
      return defaultBlockParams().widthM;
    case 'beverage-can':
      return defaultBeverageCanParams('standard').diameterM;
    case 'tin-can':
      return defaultTinCanParams().bodyRadiusM * 2;
    case 'wine-bottle':
      return defaultWineBottleParams('sparkling').heightM * (88 / 290);
  }
}

export function referenceFaceHeight(assetKind: AssetKind): number {
  switch (assetKind) {
    case 'smartphone':
      return SMARTPHONE_REF_SCREEN_HEIGHT_M;
    case 'tablet':
      return TABLET_REF_SCREEN_HEIGHT_M;
    case 'beverage-can':
      return defaultBeverageCanParams('standard').heightM;
    case 'tin-can':
      return tinCanMeshHeightM(defaultTinCanParams());
    case 'wine-bottle':
      return defaultWineBottleParams('bordeaux').heightM;
    default:
      return referenceFaceWidth(assetKind);
  }
}

function usesHeightReference(assetKind: AssetKind): boolean {
  return isHandheldAssetKind(assetKind) || usesAsyncPackagingRebuild(assetKind);
}

function beverageCanReferenceHeight(entity?: AssetEntity): number {
  const profile =
    entity?.beverageCanParams?.canBodyProfile ??
    defaultBeverageCanParams('standard').canBodyProfile;
  return defaultBeverageCanParams(profile).heightM;
}

export function resolveAssetAspectRatio(
  assetKind: AssetKind,
  imageWidth?: number,
  imageHeight?: number,
  entity?: AssetEntity,
): number {
  if (isBeverageCanAssetKind(assetKind)) {
    const profile =
      entity?.beverageCanParams?.canBodyProfile ?? 'standard';
    const printable = computeLabelPrintableBandMm(profile);
    return computeLabelUnfoldAspect(printable).widthOverHeight;
  }

  if (isTinCanAssetKind(assetKind)) {
    const params = entity?.tinCanParams ?? defaultTinCanParams();
    return computeTinCanLabelUnfoldAspect(params).widthOverHeight;
  }

  if (isWineBottleAssetKind(assetKind)) {
    return 4 / 3;
  }

  if (imageWidth && imageHeight && imageWidth > 0 && imageHeight > 0) {
    return imageWidth / imageHeight;
  }

  switch (assetKind) {
    case 'print':
      return PRINT_PLACEHOLDER_ASPECT;
    case 'picture':
      return PICTURE_PLACEHOLDER_ASPECT;
    case 'smartphone':
    case 'tablet':
      return HANDHELD_PLACEHOLDER_ASPECT;
    case 'monitor':
      return MONITOR_PLACEHOLDER_ASPECT;
    case 'wall':
    case 'wall-door':
      return 1;
    case 'block':
    case 'beverage-can':
    case 'tin-can':
    case 'wine-bottle':
      return 1;
  }

  return 1;
}

const SIZE_SCALE_RANGE_EPSILON = 1e-9;

function isSizeScaleInRange(sizeScale: number): boolean {
  return (
    sizeScale >= SIZE_SCALE_MIN - SIZE_SCALE_RANGE_EPSILON &&
    sizeScale <= SIZE_SCALE_MAX + SIZE_SCALE_RANGE_EPSILON
  );
}

export function sizeScaleFromFaceWidth(
  assetKind: AssetKind,
  widthM: number,
): number | null {
  if (widthM <= 0) return null;

  if (usesHeightReference(assetKind)) {
    const aspect = HANDHELD_PLACEHOLDER_ASPECT;
    const refHeight = referenceFaceHeight(assetKind);
    const sizeScale = widthM / (refHeight * aspect);
    if (!isSizeScaleInRange(sizeScale)) return null;
    return sizeScale;
  }

  const refWidth = referenceFaceWidth(assetKind);
  const sizeScale = widthM / refWidth;
  if (!isSizeScaleInRange(sizeScale)) return null;

  return sizeScale;
}

export function sizeScaleFromFaceHeight(
  assetKind: AssetKind,
  heightM: number,
  aspect: number,
): number | null {
  if (heightM <= 0 || aspect <= 0) return null;

  if (usesHeightReference(assetKind)) {
    const refHeight = referenceFaceHeight(assetKind);
    const sizeScale = heightM / refHeight;
    if (!isSizeScaleInRange(sizeScale)) return null;
    return sizeScale;
  }

  const refWidth = referenceFaceWidth(assetKind);
  const sizeScale = (heightM * aspect) / refWidth;
  if (!isSizeScaleInRange(sizeScale)) return null;

  return sizeScale;
}

export function resolveEntityImagePixels(
  entity: AssetEntity,
  images: ImageAsset[],
): { width?: number; height?: number } {
  const byId = new Map(images.map((image) => [image.id, image]));

  if (entity.assetKind === 'print' && entity.faces?.front.mode === 'image') {
    const imageId = entity.faces.front.imageId;
    const image = imageId ? byId.get(imageId) : undefined;
    return { width: image?.width, height: image?.height };
  }

  if (entity.screenImageId) {
    const image = byId.get(entity.screenImageId);
    return { width: image?.width, height: image?.height };
  }

  return {};
}

export function computeFaceSize(
  assetKind: AssetKind,
  imageWidth?: number,
  imageHeight?: number,
  sizeScale: number = DEFAULT_SIZE_SCALE,
  wallParams = defaultWallParams(),
  blockParams = defaultBlockParams(),
  entity?: AssetEntity,
): FaceSize {
  if (isBeverageCanAssetKind(assetKind)) {
    const params = entity?.beverageCanParams ?? defaultBeverageCanParams('standard');
    const scale = clampSizeScale(sizeScale);
    return {
      width: params.diameterM * scale,
      height: params.heightM * scale,
    };
  }

  if (isTinCanAssetKind(assetKind)) {
    const params = entity?.tinCanParams ?? defaultTinCanParams();
    const scale = clampSizeScale(sizeScale);
    return {
      width: params.bodyRadiusM * 2 * scale,
      height: params.bodyHeightM * scale,
    };
  }

  if (isBlockAssetKind(assetKind)) {
    return {
      width: blockParams.widthM,
      height: blockParams.heightM,
    };
  }

  if (isWallAssetKind(assetKind)) {
    return {
      width: wallParams.widthM,
      height: wallParams.heightM,
    };
  }

  const scale = clampSizeScale(sizeScale);
  const aspect = resolveAssetAspectRatio(assetKind, imageWidth, imageHeight, entity);

  if (usesHeightReference(assetKind)) {
    const refHeight = isBeverageCanAssetKind(assetKind)
      ? beverageCanReferenceHeight(entity)
      : isWineBottleAssetKind(assetKind)
        ? (entity?.wineBottleParams?.heightM ??
          defaultWineBottleParams('bordeaux').heightM)
        : referenceFaceHeight(assetKind);
    const height = refHeight * scale;
    return { width: height * aspect, height };
  }

  const width = referenceFaceWidth(assetKind) * scale;
  return { width, height: width / aspect };
}

export function assetFootprintHeight(
  assetKind: AssetKind,
  face: FaceSize,
  sizeScale: number = DEFAULT_SIZE_SCALE,
  entity?: AssetEntity,
): number {
  const scale = clampSizeScale(sizeScale);

  switch (assetKind) {
    case 'print':
      return face.height;
    case 'picture':
      return face.height + 2 * PICTURE_FRAME_THICKNESS_M * scale;
    case 'smartphone':
    case 'tablet': {
      const params = entity?.params;
      if (!params) {
        return face.height;
      }
      return face.height + 2 * bezelWidthM(params, scale);
    }
    case 'monitor': {
      const params = (entity?.params ?? defaultMonitorParams()) as MonitorDeviceParams;
      const outerDisplayHeight = face.height + 2 * bezelWidthM(params, scale);
      const { baseHeightM, footHeightM } = monitorStandHeightsM(params, scale);
      return baseHeightM + footHeightM + outerDisplayHeight;
    }
    case 'wall':
    case 'wall-door':
      return entity?.wallParams?.heightM ?? defaultWallParams().heightM;
    case 'block':
      return entity?.blockParams?.heightM ?? defaultBlockParams().heightM;
    case 'beverage-can': {
      const params = entity?.beverageCanParams ?? defaultBeverageCanParams('standard');
      return params.heightM * scale;
    }
    case 'tin-can': {
      const params = entity?.tinCanParams ?? defaultTinCanParams();
      return tinCanMeshHeightM(params) * scale;
    }
    case 'wine-bottle': {
      const params = entity?.wineBottleParams ?? defaultWineBottleParams('bordeaux');
      return (
        params.heightM * scale +
        params.capsuleDiscHeightM * scale
      );
    }
  }
}

/** Entity transform Y when spawning with the asset foot on the ground plane (y = 0). */
export function assetGroundCenterY(
  assetKind: AssetKind,
  face: FaceSize,
  sizeScale: number = DEFAULT_SIZE_SCALE,
  entity?: AssetEntity,
): number {
  const footprint = assetFootprintHeight(assetKind, face, sizeScale, entity);
  return transformYForFootWorldYFromFootprint(assetKind, footprint, 0);
}

export function assetTransformUsesFootPivot(assetKind: AssetKind): boolean {
  const family = getAssetKindFamily(assetKind);
  if (family === 'print' || family === 'picture') return false;
  if (family === 'architecture' || family === 'block' || family === 'packaging') {
    return true;
  }
  if (family === 'device') return isMonitorAssetKind(assetKind);
  return false;
}

function transformYForFootWorldYFromFootprint(
  assetKind: AssetKind,
  footprintHeight: number,
  footWorldY: number,
): number {
  if (assetTransformUsesFootPivot(assetKind)) {
    return footWorldY;
  }
  return footWorldY + footprintHeight * 0.5;
}

export function footWorldY(
  entity: AssetEntity,
  imageResolver: ImageResolver | null,
): number {
  const face = computeEntityFaceSize(entity, imageResolver);
  const footprint = assetFootprintHeight(
    entity.assetKind,
    face,
    entity.sizeScale,
    entity,
  );
  const { y } = entity.transform.position;
  if (assetTransformUsesFootPivot(entity.assetKind)) {
    return y;
  }
  return y - footprint * 0.5;
}

export function transformYForFootWorldY(
  entity: AssetEntity,
  footWorldY: number,
  imageResolver: ImageResolver | null,
): number {
  const face = computeEntityFaceSize(entity, imageResolver);
  const footprint = assetFootprintHeight(
    entity.assetKind,
    face,
    entity.sizeScale,
    entity,
  );
  return transformYForFootWorldYFromFootprint(
    entity.assetKind,
    footprint,
    footWorldY,
  );
}

export function footWorldYPreservedAfterFootprintChange(
  entityBefore: AssetEntity,
  entityAfter: AssetEntity,
  imageResolver: ImageResolver | null,
): boolean {
  const footBefore = footWorldY(entityBefore, imageResolver);
  const footAfter = footWorldY(entityAfter, imageResolver);
  return Math.abs(footAfter - footBefore) <= FOOT_WORLD_Y_EPSILON_M;
}

export function computeEntityFaceSize(
  entity: AssetEntity,
  imageResolver: ImageResolver | null,
): FaceSize {
  let imageWidth: number | undefined;
  let imageHeight: number | undefined;

  if (entity.assetKind === 'print' && entity.faces?.front.mode === 'image') {
    const imageId = entity.faces.front.imageId;
    const meta = imageId ? imageResolver?.(imageId) : null;
    imageWidth = meta?.width;
    imageHeight = meta?.height;
  } else if (entity.screenImageId) {
    const meta = imageResolver?.(entity.screenImageId);
    imageWidth = meta?.width;
    imageHeight = meta?.height;
  }

  return computeFaceSize(
    entity.assetKind,
    imageWidth,
    imageHeight,
    entity.sizeScale,
    entity.wallParams ?? defaultWallParams(),
    entity.blockParams ?? defaultBlockParams(),
    entity,
  );
}
