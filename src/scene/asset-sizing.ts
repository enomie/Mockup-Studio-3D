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
  wineBottleFootprintAspect,
  wineBottleMaxOuterDiameterM,
} from './asset-wine-bottle';
import {
  defaultPenParams,
  isPenAssetKind,
  penFootprintAspect,
  penNominalFootprintM,
} from './asset-pen';
import { defaultBlockParams, isBlockAssetKind } from './asset-block';
import { defaultCylinderParams, isCylinderAssetKind } from './asset-cylinder';
import { defaultSphereParams, isSphereAssetKind } from './asset-sphere';
import { defaultWheelCarParams, isWheelCarAssetKind } from './asset-wheel-car';
import {
  FABRIC_CLOTH_MESH_THICKNESS_M,
  FABRIC_CLOTH_PLACEHOLDER_ASPECT,
  FABRIC_CLOTH_REF_WIDTH_M,
  isFabricClothBakedAssetKind,
} from './asset-fabric-cloth';
import { BOOK_PLACEHOLDER_ASPECT, BOOK_REF_COVER_WIDTH_M } from './asset-book';
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

export interface FaceSize {
  width: number;
  height: number;
}

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
  if (assetKind === 'print') {return PRINT_DEFAULT_DEPTH;}
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
    case 'cylinder':
      return defaultCylinderParams().radiusM * 2;
    case 'sphere':
      return defaultSphereParams().radiusM * 2;
    case 'wheel-car':
      return defaultWheelCarParams().outerRadiusM * 2;
    case 'beverage-can':
      return defaultBeverageCanParams('standard').diameterM;
    case 'tin-can':
      return defaultTinCanParams().bodyRadiusM * 2;
    case 'wine-bottle':
      return defaultWineBottleParams('sparkling').heightM * (88 / 290);
    case 'pen':
      return penNominalFootprintM('marker').widthM;
    case 'fabric-cloth':
    case 'fabric-cloth-baked':
      return FABRIC_CLOTH_REF_WIDTH_M;
    case 'book-softcover':
    case 'book-hardcover':
      return BOOK_REF_COVER_WIDTH_M;
    case 'triangle-patch':
    case 'quad-patch':
      return 1.0;
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
    case 'pen':
      return penNominalFootprintM('marker').heightM;
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

function wineBottleReferenceHeight(entity?: AssetEntity): number {
  return (
    entity?.wineBottleParams?.heightM ?? defaultWineBottleParams('bordeaux').heightM
  );
}

function packagingReferenceHeight(
  assetKind: AssetKind,
  entity?: AssetEntity,
): number {
  if (isBeverageCanAssetKind(assetKind)) {
    return beverageCanReferenceHeight(entity);
  }
  if (isWineBottleAssetKind(assetKind)) {
    return wineBottleReferenceHeight(entity);
  }
  if (isTinCanAssetKind(assetKind)) {
    const params = entity?.tinCanParams ?? defaultTinCanParams();
    return tinCanMeshHeightM(params);
  }
  return referenceFaceHeight(assetKind);
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
    const params = entity?.wineBottleParams ?? defaultWineBottleParams('bordeaux');
    return wineBottleFootprintAspect(params.wineBottleBodyProfile, params.heightM);
  }

  if (isPenAssetKind(assetKind)) {
    const profile =
      entity?.penParams?.penBodyProfile ?? defaultPenParams('marker').penBodyProfile;
    return penFootprintAspect(profile);
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
      return 1;
    case 'fabric-cloth':
      return entity?.fabricClothParams?.placeholderAspect ?? FABRIC_CLOTH_PLACEHOLDER_ASPECT;
    case 'book-softcover':
    case 'book-hardcover':
      return BOOK_PLACEHOLDER_ASPECT;
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
  aspect: number,
  entity?: AssetEntity,
): number | null {
  if (widthM <= 0) {return null;}

  if (usesHeightReference(assetKind)) {
    if (aspect <= 0) {return null;}
    const refHeight = packagingReferenceHeight(assetKind, entity);
    const sizeScale = widthM / (refHeight * aspect);
    if (!isSizeScaleInRange(sizeScale)) {return null;}
    return sizeScale;
  }

  const refWidth = referenceFaceWidth(assetKind);
  const sizeScale = widthM / refWidth;
  if (!isSizeScaleInRange(sizeScale)) {return null;}

  return sizeScale;
}

export function sizeScaleFromFaceHeight(
  assetKind: AssetKind,
  heightM: number,
  aspect: number,
  entity?: AssetEntity,
): number | null {
  if (heightM <= 0 || aspect <= 0) {return null;}

  if (usesHeightReference(assetKind)) {
    const refHeight = packagingReferenceHeight(assetKind, entity);
    const sizeScale = heightM / refHeight;
    if (!isSizeScaleInRange(sizeScale)) {return null;}
    return sizeScale;
  }

  const refWidth = referenceFaceWidth(assetKind);
  const sizeScale = (heightM * aspect) / refWidth;
  if (!isSizeScaleInRange(sizeScale)) {return null;}

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

  if (isPenAssetKind(assetKind)) {
    const profile =
      entity?.penParams?.penBodyProfile ?? defaultPenParams('marker').penBodyProfile;
    const footprint = penNominalFootprintM(profile);
    const scale = clampSizeScale(sizeScale);
    return {
      width: footprint.widthM * scale,
      height: footprint.heightM * scale,
    };
  }

  if (isWineBottleAssetKind(assetKind)) {
    const params = entity?.wineBottleParams ?? defaultWineBottleParams('bordeaux');
    const scale = clampSizeScale(sizeScale);
    return {
      width: wineBottleMaxOuterDiameterM(params.wineBottleBodyProfile) * scale,
      height: params.heightM * scale,
    };
  }

  if (isBlockAssetKind(assetKind)) {
    return {
      width: blockParams.widthM,
      height: blockParams.heightM,
    };
  }

  if (isCylinderAssetKind(assetKind)) {
    const params = entity?.cylinderParams ?? defaultCylinderParams();
    return {
      width: params.radiusM * 2,
      height: params.heightM,
    };
  }

  if (isSphereAssetKind(assetKind)) {
    const params = entity?.sphereParams ?? defaultSphereParams();
    const d = params.radiusM * 2;
    return { width: d, height: d };
  }

  if (isWheelCarAssetKind(assetKind)) {
    const params = entity?.wheelCarParams ?? defaultWheelCarParams();
    const d = params.outerRadiusM * 2;
    return { width: d, height: d };
  }

  if (isFabricClothBakedAssetKind(assetKind) && entity?.bakedClothFootprint) {
    const scale = clampSizeScale(sizeScale);
    return {
      width: entity.bakedClothFootprint.widthM * scale,
      height: entity.bakedClothFootprint.heightM * scale,
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
    const refHeight = packagingReferenceHeight(assetKind, entity);
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
    case 'cylinder':
      return entity?.cylinderParams?.heightM ?? defaultCylinderParams().heightM;
    case 'sphere':
      return (entity?.sphereParams?.radiusM ?? defaultSphereParams().radiusM) * 2;
    case 'wheel-car':
      return (
        entity?.wheelCarParams?.outerRadiusM ?? defaultWheelCarParams().outerRadiusM
      ) * 2;
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
    case 'pen': {
      const profile =
        entity?.penParams?.penBodyProfile ?? defaultPenParams('marker').penBodyProfile;
      return penNominalFootprintM(profile).heightM * scale;
    }
    case 'fabric-cloth':
    case 'fabric-cloth-baked':
      return FABRIC_CLOTH_MESH_THICKNESS_M;
    case 'book-softcover':
    case 'book-hardcover':
      return face.height;
    case 'triangle-patch':
    case 'quad-patch':
      return 0.5;
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
  if (family === 'print' || family === 'picture') {return false;}
  if (
    family === 'architecture' ||
    family === 'block' ||
    family === 'fabric' ||
    family === 'book' ||
    family === 'packaging'
  ) {
    return true;
  }
  return isMonitorAssetKind(assetKind);
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
