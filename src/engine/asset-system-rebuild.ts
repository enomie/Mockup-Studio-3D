import type { AssetKind } from '@/scene/asset-kind';
import type { Group, Texture } from 'three/webgpu';
import { defaultHandheldParams } from '@/scene/asset-handheld';
import {
  defaultMonitorParams,
  type MonitorDeviceParams,
} from '@/scene/asset-monitor';
import type {
  AssetFaceContent,
  AssetFaceId,
  AssetFaces,
} from '@/scene/asset-faces';
import type { AssetEntity, ImageResolver } from '@/scene/entity-types';
import { getAssetKindDefinition } from '@/scene/asset-kind-registry';
import { migrateGeometryVisibility } from '@/scene/geometry-visibility';
import { defaultPrintParams } from '@/scene/asset-print';
import { defaultBeverageCanParams } from '@/scene/asset-beverage-can';
import { defaultTinCanParams } from '@/scene/asset-tin-can';
import { defaultWineBottleParams } from '@/scene/asset-wine-bottle';
import { defaultPenParams } from '@/scene/asset-pen';
import { defaultBlockParams, isBlockAssetKind } from '@/scene/asset-block';
import { defaultCylinderParams, isCylinderAssetKind } from '@/scene/asset-cylinder';
import {
  defaultSphereParams,
  isSphereAssetKind,
} from '@/scene/asset-sphere';
import { defaultTrianglePatchParams } from '@/scene/asset-triangle-patch';
import {
  defaultWheelCarParams,
  isWheelCarAssetKind,
} from '@/scene/asset-wheel-car';

import { defaultFabricClothParams } from '@/scene/asset-fabric-cloth';
import type { UserBakedAssetResolver } from '@/scene/user-baked-asset';
import { resolveBookParams } from '@/scene/asset-book';
import {
  defaultWallParams,
  defaultWallpaperPattern,
  resolveWallpaperPattern,
} from '@/scene/asset-wall';
import {
  computeEntityFaceSize,
  footWorldY,
  transformYForFootWorldY,
} from '@/scene/asset-sizing';
import {
  populateAssetGroup,
  populateBeverageCanGroup,
  populateTinCanGroup,
  populateWineBottleGroup,
  populatePenGroup,
  type ImageSize,
} from './asset-meshes/index';
import { addWheelCar } from './asset-meshes/populate-wheel-car';
import type { EntityRegistry } from './entity-registry';
import type { ImageTextureLoader } from './image-texture-loader';
import type { MaterialResolver } from './material-resolver';
import type { ViewportInvalidation } from './viewport-invalidation';
import type { RigidPrimitivePhysicsColliders } from './rigid-primitive-physics-colliders';
import type { FabricClothSimulationParticipant } from './fabric-cloth-simulation-participant';

export interface AssetRebuildContext {
  registry: EntityRegistry;
  textureLoader: ImageTextureLoader;
  materialResolver: MaterialResolver;
  imageResolver: ImageResolver | null;
  viewportInvalidation: ViewportInvalidation | null;
  rigidPrimitivePhysics: RigidPrimitivePhysicsColliders | null;
  fabricClothSimulation: FabricClothSimulationParticipant | null;
  userBakedAssetResolver: UserBakedAssetResolver | null;
}

interface EntityRebuildQueue {
  running: Promise<void>;
  pending: Promise<void> | null;
  latestCtx: AssetRebuildContext;
}

const rebuildQueues = new WeakMap<EntityRegistry, Map<string, EntityRebuildQueue>>();

/**
 * Rebuilds an entity with at most one rebuild running and one queued per entity.
 * Calls arriving while a rebuild is queued share it, since the queued rebuild reads
 * the latest entity state when it starts. This keeps an older rebuild from finishing
 * after a newer one and overwriting it with stale geometry.
 */
export function rebuildEntity(ctx: AssetRebuildContext, entityId: string): Promise<void> {
  let queues = rebuildQueues.get(ctx.registry);
  if (!queues) {
    queues = new Map();
    rebuildQueues.set(ctx.registry, queues);
  }
  const map = queues;

  const start = (startCtx: AssetRebuildContext): Promise<void> => {
    const running = rebuildEntityNow(startCtx, entityId).catch((error: unknown) => {
      console.error(`Rebuild failed for entity ${entityId}`, error);
    });
    void running.then(() => {
      const queue = map.get(entityId);
      if (queue?.running === running && !queue.pending) {
        map.delete(entityId);
      }
    });
    return running;
  };

  const queue = map.get(entityId);
  if (!queue) {
    const running = start(ctx);
    map.set(entityId, { running, pending: null, latestCtx: ctx });
    return running;
  }

  queue.latestCtx = ctx;
  if (queue.pending) {return queue.pending;}

  const pending = queue.running.then(() => {
    queue.pending = null;
    queue.running = start(queue.latestCtx);
    return queue.running;
  });
  queue.pending = pending;
  return pending;
}

type EntityRebuilder = (
  ctx: AssetRebuildContext,
  root: Group,
  entity: AssetEntity,
) => Promise<void>;

function rebuildTrianglePatch(
  ctx: AssetRebuildContext,
  root: Group,
  entity: AssetEntity,
): Promise<void> {
  const definition = getAssetKindDefinition(entity.assetKind);
  populateAssetGroup(root, 'triangle-patch', {
    materials: entity.materials ?? definition.getDefaultMaterials(),
    materialResolver: ctx.materialResolver,
    trianglePatchParams: entity.trianglePatchParams ?? defaultTrianglePatchParams(),
  });
  return Promise.resolve();
}

/** Rebuild function per asset kind; exhaustive so new kinds must register one. */
const REBUILDERS: Record<AssetKind, EntityRebuilder> = {
  print: rebuildFacetedAsset,
  picture: rebuildPicture,
  smartphone: rebuildHandheld,
  tablet: rebuildHandheld,
  monitor: rebuildMonitor,
  wall: rebuildWall,
  'wall-door': rebuildWall,
  block: rebuildRigidPrimitive,
  cylinder: rebuildRigidPrimitive,
  sphere: rebuildRigidPrimitive,
  'wheel-car': rebuildRigidPrimitive,
  'beverage-can': rebuildBeverageCan,
  'tin-can': rebuildTinCan,
  'wine-bottle': rebuildWineBottle,
  pen: rebuildPen,
  'fabric-cloth': rebuildFabricCloth,
  'fabric-cloth-baked': rebuildFabricClothBaked,
  'book-softcover': rebuildBook,
  'book-hardcover': rebuildBook,
  'triangle-patch': rebuildTrianglePatch,
};

async function rebuildEntityNow(ctx: AssetRebuildContext, entityId: string): Promise<void> {
  const runtime = ctx.registry.getRuntime(entityId);
  if (!runtime) {return;}

  const footY = footWorldY(runtime.entity, ctx.imageResolver);
  try {
    await REBUILDERS[runtime.entity.assetKind](ctx, runtime.object as Group, runtime.entity);
    syncEntityYForFoot(ctx, entityId, footY);
  } finally {
    ctx.viewportInvalidation?.invalidate();
  }
}

export function syncEntityYForFoot(
  ctx: AssetRebuildContext,
  entityId: string,
  footY: number,
): void {
    const runtime = ctx.registry.getRuntime(entityId);
    if (!runtime) {return;}

    const nextY = transformYForFootWorldY(
      runtime.entity,
      footY,
      ctx.imageResolver,
    );
    const currentY = runtime.entity.transform.position.y;
    if (Math.abs(nextY - currentY) <= 1e-6) {return;}

    ctx.registry.updateTransform(entityId, {
      position: {
        ...runtime.entity.transform.position,
        y: nextY,
      },
    });
  }

export async function rebuildBeverageCan(ctx: AssetRebuildContext, root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = ctx.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
        imageTexture = await ctx.textureLoader.load(entity.screenImageId);
      }
    }

    const definition = getAssetKindDefinition(entity.assetKind);
    const materials = entity.materials ?? definition.getDefaultMaterials();

    await populateBeverageCanGroup(root, {
      beverageCanParams:
        entity.beverageCanParams ?? defaultBeverageCanParams('standard'),
      imageTexture,
      imageWidth,
      imageHeight,
      sizeScale: entity.sizeScale,
      materials,
      geometryVisibility: migrateGeometryVisibility(
        entity.assetKind,
        entity.geometryVisibility ?? definition.getGeometryVisibilityDefaults(),
        materials,
      ),
      materialResolver: ctx.materialResolver,
      imageSurfaces: entity.imageSurfaces,
      assetKind: 'beverage-can',
    });
  }

export async function rebuildTinCan(ctx: AssetRebuildContext, root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = ctx.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
        imageTexture = await ctx.textureLoader.load(entity.screenImageId);
      }
    }

    const definition = getAssetKindDefinition(entity.assetKind);
    const materials = entity.materials ?? definition.getDefaultMaterials();

    populateTinCanGroup(root, {
      tinCanParams: entity.tinCanParams ?? defaultTinCanParams(),
      imageTexture,
      imageWidth,
      imageHeight,
      sizeScale: entity.sizeScale,
      materials,
      geometryVisibility: migrateGeometryVisibility(
        entity.assetKind,
        entity.geometryVisibility ?? definition.getGeometryVisibilityDefaults(),
        materials,
      ),
      materialResolver: ctx.materialResolver,
      imageSurfaces: entity.imageSurfaces,
      assetKind: 'tin-can',
    });
  }

export async function rebuildWineBottle(ctx: AssetRebuildContext, root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = ctx.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
        imageTexture = await ctx.textureLoader.load(entity.screenImageId);
      }
    }

    const definition = getAssetKindDefinition(entity.assetKind);
    const materials = entity.materials ?? definition.getDefaultMaterials();

    await populateWineBottleGroup(root, {
      wineBottleParams:
        entity.wineBottleParams ?? defaultWineBottleParams('bordeaux'),
      imageTexture,
      imageWidth,
      imageHeight,
      sizeScale: entity.sizeScale,
      materials,
      geometryVisibility: migrateGeometryVisibility(
        entity.assetKind,
        entity.geometryVisibility ?? definition.getGeometryVisibilityDefaults(),
        materials,
      ),
      materialResolver: ctx.materialResolver,
      imageSurfaces: entity.imageSurfaces,
      assetKind: 'wine-bottle',
    });
  }

export async function rebuildPen(
  ctx: AssetRebuildContext,
  root: Group,
  entity: AssetEntity,
): Promise<void> {
  let imageTexture = null;
  let imageWidth: number | undefined;
  let imageHeight: number | undefined;

  if (entity.screenImageId) {
    const meta = ctx.imageResolver?.(entity.screenImageId);
    if (meta) {
      imageWidth = meta.width;
      imageHeight = meta.height;
      imageTexture = await ctx.textureLoader.load(entity.screenImageId);
    }
  }

  const definition = getAssetKindDefinition(entity.assetKind);
  const materials = entity.materials ?? definition.getDefaultMaterials();

  await populatePenGroup(root, {
    penParams: entity.penParams ?? defaultPenParams('marker'),
    imageTexture,
    imageWidth,
    imageHeight,
    sizeScale: entity.sizeScale,
    materials,
    geometryVisibility: migrateGeometryVisibility(
      entity.assetKind,
      entity.geometryVisibility ?? definition.getGeometryVisibilityDefaults(),
      materials,
    ),
    materialResolver: ctx.materialResolver,
    imageSurfaces: entity.imageSurfaces,
    assetKind: 'pen',
  });
}

export async function rebuildFacetedAsset(ctx: AssetRebuildContext, root: Group, entity: AssetEntity): Promise<void> {
    const faces = entity.faces;
    const depth = entity.depth;
    if (!faces || depth === undefined) {return;}

    const face = computeEntityFaceSize(entity, ctx.imageResolver);
    const { faceTextures, faceImageSizes } = await loadFaceTextures(ctx, faces);
    const frontImageId = faces.front.mode === 'image' ? faces.front.imageId : null;
    const frontMeta = frontImageId ? ctx.imageResolver?.(frontImageId) : null;
    const definition = getAssetKindDefinition(entity.assetKind);
    const materials = entity.materials ?? definition.getDefaultMaterials();

    populateAssetGroup(root, entity.assetKind, {
      faces,
      depth,
      faceWidth: face.width,
      faceHeight: face.height,
      faceTextures,
      faceImageSizes,
      imageWidth: frontMeta?.width,
      imageHeight: frontMeta?.height,
      sizeScale: entity.sizeScale,
      materials,
      printParams: entity.printParams ?? defaultPrintParams(),
      materialResolver: ctx.materialResolver,
      imageSurfaces: entity.imageSurfaces,
    });
  }

export async function rebuildFabricCloth(
  ctx: AssetRebuildContext,
  root: Group,
  entity: AssetEntity,
): Promise<void> {
  let imageTexture = null;
  let imageWidth: number | undefined;
  let imageHeight: number | undefined;
  let imageName: string | undefined;

  if (entity.screenImageId) {
    const meta = ctx.imageResolver?.(entity.screenImageId);
    if (meta) {
      imageWidth = meta.width;
      imageHeight = meta.height;
      imageName = meta.name;
      imageTexture = await ctx.textureLoader.load(entity.screenImageId);
    }
  }

  const face = computeEntityFaceSize(entity, ctx.imageResolver);
  const definition = getAssetKindDefinition(entity.assetKind);
  const materials = entity.materials ?? definition.getDefaultMaterials();

  populateAssetGroup(root, 'fabric-cloth', {
    faceWidth: face.width,
    faceHeight: face.height,
    imageWidth,
    imageHeight,
    imageName,
    imageTexture,
    sizeScale: entity.sizeScale,
    materials,
    materialResolver: ctx.materialResolver,
    fabricClothParams:
      entity.fabricClothParams ?? defaultFabricClothParams(),
  });
  ctx.fabricClothSimulation?.refreshOne(entity.id);
}

export async function rebuildFabricClothBaked(
  ctx: AssetRebuildContext,
  root: Group,
  entity: AssetEntity,
): Promise<void> {
  const bakedId = entity.userBakedAssetId;
  const userAsset = bakedId ? ctx.userBakedAssetResolver?.(bakedId) : null;
  if (!userAsset) {
    return;
  }

  let imageTexture = null;
  let imageWidth: number | undefined;
  let imageHeight: number | undefined;
  let imageName: string | undefined;

  if (entity.screenImageId) {
    const meta = ctx.imageResolver?.(entity.screenImageId);
    if (meta) {
      imageWidth = meta.width;
      imageHeight = meta.height;
      imageName = meta.name;
      imageTexture = await ctx.textureLoader.load(entity.screenImageId);
    }
  }

  const definition = getAssetKindDefinition(entity.assetKind);
  const materials = entity.materials ?? definition.getDefaultMaterials();

  populateAssetGroup(root, 'fabric-cloth-baked', {
    imageWidth,
    imageHeight,
    imageName,
    imageTexture,
    materials,
    materialResolver: ctx.materialResolver,
    fabricClothParams:
      entity.fabricClothParams ?? defaultFabricClothParams(),
    bakedFabricClothMesh: userAsset.mesh,
  });
}

export async function rebuildBook(
  ctx: AssetRebuildContext,
  root: Group,
  entity: AssetEntity,
): Promise<void> {
  const loadOne = async (imageId: string | null | undefined) => {
    if (!imageId) {
      return { texture: null, width: undefined, height: undefined, name: undefined };
    }
    const meta = ctx.imageResolver?.(imageId);
    const texture = await ctx.textureLoader.load(imageId);
    return {
      texture,
      width: meta?.width,
      height: meta?.height,
      name: meta?.name,
    };
  };

  const front = await loadOne(entity.screenImageId);
  const back = await loadOne(entity.bookBackCoverImageId);
  const spine = await loadOne(entity.bookSpineImageId);

  const face = computeEntityFaceSize(entity, ctx.imageResolver);
  const definition = getAssetKindDefinition(entity.assetKind);
  const materials = entity.materials ?? definition.getDefaultMaterials();

  populateAssetGroup(root, entity.assetKind, {
    faceWidth: face.width,
    faceHeight: face.height,
    imageWidth: front.width,
    imageHeight: front.height,
    imageTexture: front.texture,
    sizeScale: entity.sizeScale,
    materials,
    materialResolver: ctx.materialResolver,
    bookParams: resolveBookParams(entity.assetKind, entity.bookParams),
    bookTextures: {
      front: front.texture,
      back: back.texture,
      spine: spine.texture,
      frontMeta: {
        width: front.width,
        height: front.height,
        name: front.name,
      },
      backMeta: {
        width: back.width,
        height: back.height,
        name: back.name,
      },
      spineMeta: {
        width: spine.width,
        height: spine.height,
        name: spine.name,
      },
    },
  });
}

export async function rebuildPicture(ctx: AssetRebuildContext, root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = ctx.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
        imageTexture = await ctx.textureLoader.load(entity.screenImageId);
      }
    }

    const face = computeEntityFaceSize(entity, ctx.imageResolver);
    const definition = getAssetKindDefinition(entity.assetKind);
    const materials = entity.materials ?? definition.getDefaultMaterials();

    populateAssetGroup(root, 'picture', {
      faceWidth: face.width,
      faceHeight: face.height,
      imageWidth,
      imageHeight,
      imageTexture,
      sizeScale: entity.sizeScale,
      materials,
      geometryVisibility: migrateGeometryVisibility(
        entity.assetKind,
        entity.geometryVisibility ?? definition.getGeometryVisibilityDefaults(),
        materials,
      ),
      materialResolver: ctx.materialResolver,
      imageSurfaces: entity.imageSurfaces,
    });
  }

export async function rebuildWall(ctx: AssetRebuildContext, root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = ctx.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
      }
      imageTexture = await ctx.textureLoader.load(entity.screenImageId);
    }

    const definition = getAssetKindDefinition(entity.assetKind);
    const materials = entity.materials ?? definition.getDefaultMaterials();
    const wallParams = entity.wallParams ?? defaultWallParams();
    const wallpaperPattern = resolveWallpaperPattern(
      entity.wallpaperPattern ?? defaultWallpaperPattern(),
      imageWidth,
      imageHeight,
    );

    populateAssetGroup(root, entity.assetKind, {
      imageTexture,
      imageWidth,
      imageHeight,
      materials,
      materialResolver: ctx.materialResolver,
      wallParams,
      wallpaperPattern,
      assetKind: entity.assetKind,
      imageSurfaces: entity.imageSurfaces,
    });
  }

export async function rebuildRigidPrimitive(
  ctx: AssetRebuildContext,
  root: Group,
  entity: AssetEntity,
): Promise<void> {
  const definition = getAssetKindDefinition(entity.assetKind);
  const materials = entity.materials ?? definition.getDefaultMaterials();

  if (isBlockAssetKind(entity.assetKind)) {
    populateAssetGroup(root, 'block', {
      materials,
      materialResolver: ctx.materialResolver,
      blockParams: entity.blockParams ?? defaultBlockParams(),
    });
  } else if (isCylinderAssetKind(entity.assetKind)) {
    populateAssetGroup(root, 'cylinder', {
      materials,
      materialResolver: ctx.materialResolver,
      cylinderParams: entity.cylinderParams ?? defaultCylinderParams(),
    });
  } else if (isSphereAssetKind(entity.assetKind)) {
    populateAssetGroup(root, 'sphere', {
      materials,
      materialResolver: ctx.materialResolver,
      sphereParams: entity.sphereParams ?? defaultSphereParams(),
    });
  } else if (isWheelCarAssetKind(entity.assetKind)) {
    await addWheelCar(
      root,
      ctx.materialResolver,
      materials,
      entity.wheelCarParams ?? defaultWheelCarParams(),
    );
  }

  ctx.rigidPrimitivePhysics?.refreshOne(entity.id);
}

export async function rebuildHandheld(ctx: AssetRebuildContext, root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = ctx.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
        imageTexture = await ctx.textureLoader.load(entity.screenImageId);
      }
    }

    const face = computeEntityFaceSize(entity, ctx.imageResolver);
    const definition = getAssetKindDefinition(entity.assetKind);
    const materials = entity.materials ?? definition.getDefaultMaterials();
    const handheldParams =
      entity.params ?? defaultHandheldParams(entity.assetKind);

    populateAssetGroup(root, entity.assetKind, {
      faceWidth: face.width,
      faceHeight: face.height,
      imageWidth,
      imageHeight,
      imageTexture,
      sizeScale: entity.sizeScale,
      materials,
      geometryVisibility: migrateGeometryVisibility(
        entity.assetKind,
        entity.geometryVisibility ?? definition.getGeometryVisibilityDefaults(),
        materials,
      ),
      materialResolver: ctx.materialResolver,
      handheldParams,
      assetKind: entity.assetKind,
      imageSurfaces: entity.imageSurfaces,
    });
  }

export async function rebuildMonitor(ctx: AssetRebuildContext, root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = ctx.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
        imageTexture = await ctx.textureLoader.load(entity.screenImageId);
      }
    }

    const face = computeEntityFaceSize(entity, ctx.imageResolver);
    const definition = getAssetKindDefinition(entity.assetKind);
    const materials = entity.materials ?? definition.getDefaultMaterials();
    const monitorParams =
      (entity.params as MonitorDeviceParams | undefined) ??
      defaultMonitorParams();

    populateAssetGroup(root, 'monitor', {
      faceWidth: face.width,
      faceHeight: face.height,
      imageWidth,
      imageHeight,
      imageTexture,
      sizeScale: entity.sizeScale,
      materials,
      geometryVisibility: migrateGeometryVisibility(
        entity.assetKind,
        entity.geometryVisibility ?? definition.getGeometryVisibilityDefaults(),
        materials,
      ),
      materialResolver: ctx.materialResolver,
      monitorParams,
      imageSurfaces: entity.imageSurfaces,
    });
  }

async function loadFaceTextures(
  ctx: AssetRebuildContext,
  faces: AssetFaces,
): Promise<{
  faceTextures: Partial<Record<AssetFaceId, Texture | null>>;
  faceImageSizes: Partial<Record<AssetFaceId, ImageSize | null>>;
}> {
  const faceTextures: Partial<Record<AssetFaceId, Texture | null>> = {};
  const faceImageSizes: Partial<Record<AssetFaceId, ImageSize | null>> = {};

  for (const [faceId, content] of Object.entries(faces) as [
    AssetFaceId,
    AssetFaceContent,
  ][]) {
    if (content.mode === 'image' && content.imageId) {
      const meta = ctx.imageResolver?.(content.imageId);
      if (meta) {
        faceImageSizes[faceId] = { width: meta.width, height: meta.height };
      }
      faceTextures[faceId] = await ctx.textureLoader.load(content.imageId);
    }
  }

  return { faceTextures, faceImageSizes };
}
