import type { Group } from 'three/webgpu';
import { defaultBlockParams } from '@/scene/asset-block';
import { defaultCylinderParams } from '@/scene/asset-cylinder';
import { defaultSphereParams } from '@/scene/asset-sphere';
import { defaultPrintParams } from '@/scene/asset-print';
import {
  defaultWallParams,
  defaultWallpaperPattern,
  resolveWallpaperPattern,
} from '@/scene/asset-wall';
import type { AssetKind } from '@/scene/entity-types';
import { computeFaceSize } from '@/scene/asset-sizing';
import { applyAssetShadowFlags } from '@/render/shadow-setup';
import type { AssetBuildContext } from './asset-build-context';
import { disposeAssetGroup } from './dispose-asset-group';
import { addHandheld, addMonitor } from './populate-devices';
import { defaultFabricClothParams } from '@/scene/asset-fabric-cloth';
import {
  addBlock,
  addCylinder,
  addSphere,
  addFabricCloth,
  addFacetedPrism,
  addPicture,
  addWall,
} from './populate-primitives';
import { addBook } from './populate-book';
import { resolveBookParams } from '@/scene/asset-book';

export function populateAssetGroup(
  group: Group,
  assetKind: AssetKind,
  context: AssetBuildContext = {},
): void {
  disposeAssetGroup(group);
  const sizeScale = context.sizeScale ?? 1;
  const face = computeFaceSize(
    assetKind,
    context.imageWidth,
    context.imageHeight,
    sizeScale,
    context.wallParams ?? defaultWallParams(),
    context.blockParams ?? defaultBlockParams(),
  );
  const faceWidth = context.faceWidth ?? face.width;
  const faceHeight = context.faceHeight ?? face.height;
  const resolver = context.materialResolver;
  const materials = context.materials ?? {};

  switch (assetKind) {
    case 'print':
      if (!context.faces || context.depth === undefined || !resolver) {return;}
      addFacetedPrism(
        group,
        context.faces,
        faceWidth,
        faceHeight,
        context.depth,
        context.faceTextures ?? {},
        context.faceImageSizes ?? {},
        materials,
        resolver,
        context.printParams ?? defaultPrintParams(),
        sizeScale,
        context.imageSurfaces,
      );
      break;
    case 'picture':
      if (!resolver) {return;}
      addPicture(
        group,
        faceWidth,
        faceHeight,
        resolver,
        context.imageTexture ?? null,
        materials,
        context.imageWidth,
        context.imageHeight,
        sizeScale,
        context.geometryVisibility,
        context.imageSurfaces,
      );
      break;
    case 'smartphone':
    case 'tablet':
      if (!resolver || !context.handheldParams) {return;}
      addHandheld(
        group,
        assetKind,
        faceWidth,
        faceHeight,
        resolver,
        context.imageTexture ?? null,
        materials,
        context.imageWidth,
        context.imageHeight,
        sizeScale,
        context.handheldParams,
        context.geometryVisibility,
        context.imageSurfaces,
      );
      break;
    case 'monitor':
      if (!resolver || !context.monitorParams) {return;}
      addMonitor(
        group,
        faceWidth,
        faceHeight,
        resolver,
        context.imageTexture ?? null,
        materials,
        context.imageWidth,
        context.imageHeight,
        sizeScale,
        context.monitorParams,
        context.geometryVisibility,
        context.imageSurfaces,
      );
      break;
    case 'wall':
    case 'wall-door':
      if (!resolver) {return;}
      addWall(
        group,
        assetKind,
        resolver,
        context.imageTexture ?? null,
        materials,
        context.imageSurfaces,
        context.wallParams ?? defaultWallParams(),
        resolveWallpaperPattern(
          context.wallpaperPattern ?? defaultWallpaperPattern(),
          context.imageWidth,
          context.imageHeight,
        ),
      );
      break;
    case 'block':
      if (!resolver) {return;}
      addBlock(
        group,
        resolver,
        materials,
        context.blockParams ?? defaultBlockParams(),
      );
      break;
    case 'cylinder':
      if (!resolver) {return;}
      addCylinder(
        group,
        resolver,
        materials,
        context.cylinderParams ?? defaultCylinderParams(),
      );
      break;
    case 'sphere':
      if (!resolver) {return;}
      addSphere(
        group,
        resolver,
        materials,
        context.sphereParams ?? defaultSphereParams(),
      );
      break;
    case 'wheel-car':
      // SVG lathe meshes built in rebuildRigidPrimitive (async).
      break;
    case 'fabric-cloth':
      if (!resolver) {return;}
      addFabricCloth(
        group,
        faceWidth,
        faceHeight,
        resolver,
        context.imageTexture ?? null,
        materials,
        context.imageWidth,
        context.imageHeight,
        context.imageName,
        context.fabricClothParams ?? defaultFabricClothParams(),
      );
      break;
    case 'book-softcover':
    case 'book-hardcover':
      if (!resolver) {return;}
      addBook(
        group,
        assetKind,
        faceWidth,
        faceHeight,
        resolveBookParams(assetKind, context.bookParams),
        context.bookTextures ?? {
          front: context.imageTexture ?? null,
          back: null,
          spine: null,
          frontMeta: {
            width: context.imageWidth,
            height: context.imageHeight,
            name: context.imageName,
          },
        },
        resolver,
        materials,
      );
      break;
  }

  applyAssetShadowFlags(group);
}
