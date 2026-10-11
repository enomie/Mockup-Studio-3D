import { Group, type Scene, type Texture } from 'three/webgpu';
import {
  defaultHandheldParams,
  isHandheldAssetKind,
} from '@/scene/asset-handheld';
import {
  defaultMonitorParams,
  isMonitorAssetKind,
  type MonitorDeviceParams,
} from '@/scene/asset-monitor';
import {
  defaultFacesForKind,
  isPrintAssetKind,
  type AssetFaceContent,
  type AssetFaceId,
  type AssetFaces,
} from '@/scene/asset-faces';
import type {
  AssetEntity,
  AssetGeometryPart,
  AssetImageSurfaceId,
  AssetKind,
  BlockParams,
  BeverageCanParams,
  TinCanParams,
  HandheldDeviceParams,
  ImageResolver,
  MaterialEntitySlot,
  PrintDeviceParams,
} from '@/scene/entity-types';
import {
  getAssetKindDefinition,
  getDefaultEntitySliceForKind,
  usesAsyncPackagingRebuild,
} from '@/scene/asset-kind-registry';
import { migrateGeometryVisibility } from '@/scene/geometry-visibility';
import { defaultPrintParams } from '@/scene/asset-print';
import {
  defaultBeverageCanParams,
  isBeverageCanAssetKind,
} from '@/scene/asset-beverage-can';
import {
  defaultTinCanParams,
  isTinCanAssetKind,
} from '@/scene/asset-tin-can';
import {
  defaultWineBottleParams,
  isWineBottleAssetKind,
  type WineBottleParams,
} from '@/scene/asset-wine-bottle';
import {
  defaultBlockParams,
  isBlockAssetKind,
} from '@/scene/asset-block';
import {
  defaultWallParams,
  defaultWallpaperPattern,
  isWallAssetKind,
  migrateWallpaperPattern,
  resolveWallpaperPattern,
  wallpaperStripHeightM,
  type WallParams,
  type WallpaperPattern,
} from '@/scene/asset-wall';
import type { ImageSurfaceSettings } from '@/scene/image-surface';
import {
  assetGroundCenterY,
  clampSizeScale,
  computeEntityFaceSize,
  computeFaceSize,
  defaultDepth,
  footWorldY,
  transformYForFootWorldY,
} from '@/scene/asset-sizing';
import {
  disposeAssetGroup,
  populateAssetGroup,
  populateBeverageCanGroup,
  populateTinCanGroup,
  populateWineBottleGroup,
  type ImageSize,
} from './asset-meshes';
import type { EntityRegistry } from './entity-registry';
import type { ImageTextureLoader } from './image-texture-loader';
import { MaterialResolver } from './material-resolver';
import type { Rgb } from '@/colors/rgb';
import { DEFAULT_SCENE_ASSETS } from '@/config/default-scene-assets';
import type { ViewportInvalidation } from './viewport-invalidation';

export class AssetSystem {
  private readonly scene: Scene;
  private readonly registry: EntityRegistry;
  private readonly textureLoader: ImageTextureLoader;
  private readonly materialResolver = new MaterialResolver();
  private imageResolver: ImageResolver | null = null;
  private viewportInvalidation: ViewportInvalidation | null = null;

  constructor(scene: Scene, registry: EntityRegistry, textureLoader: ImageTextureLoader) {
    this.scene = scene;
    this.registry = registry;
    this.textureLoader = textureLoader;
  }

  getMaterialResolver(): MaterialResolver {
    return this.materialResolver;
  }

  setViewportInvalidation(invalidation: ViewportInvalidation | null): void {
    this.viewportInvalidation = invalidation;
  }

  setImageResolver(resolver: ImageResolver | null): void {
    this.imageResolver = resolver;
    this.textureLoader.setResolver(resolver);
  }

  addAsset(
    assetKind: AssetKind,
    spawn?: { x: number; z: number },
  ): string {
    const id = crypto.randomUUID();
    const definition = getAssetKindDefinition(assetKind);
    const faces = defaultFacesForKind(assetKind);
    const depth = defaultDepth(assetKind);
    const materials = definition.getDefaultMaterials();
    const kindDefaults = getDefaultEntitySliceForKind(assetKind);
    const handheldParams = isHandheldAssetKind(assetKind)
      ? defaultHandheldParams(assetKind)
      : undefined;
    const monitorParams = isMonitorAssetKind(assetKind)
      ? defaultMonitorParams()
      : undefined;
    const printParams = isPrintAssetKind(assetKind)
      ? defaultPrintParams()
      : undefined;
    const frontImageId =
      faces?.front.mode === 'image' ? faces.front.imageId : null;
    const frontMeta = frontImageId ? this.imageResolver?.(frontImageId) : null;
    const spawnEntity: AssetEntity = {
      id,
      type: 'asset',
      name: '',
      assetKind,
      screenImageId: null,
      sizeScale: 1,
      materials,
      ...kindDefaults,
      params: handheldParams ?? monitorParams,
      printParams,
      visible: true,
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    };
    const face = computeFaceSize(
      assetKind,
      frontMeta?.width,
      frontMeta?.height,
      1,
      defaultWallParams(),
      defaultBlockParams(),
      spawnEntity,
    );
    const spawnY = assetGroundCenterY(assetKind, face, 1, spawnEntity);
    const transform = spawn
      ? this.registry.createTransformAt(spawn.x, spawn.z, spawnY)
      : this.registry.createSpawnTransform(spawnY);

    const root = new Group();
    root.userData.entityId = id;

    if (isPrintAssetKind(assetKind) && faces && depth !== undefined) {
      populateAssetGroup(root, assetKind, {
        faces,
        depth,
        faceWidth: face.width,
        faceHeight: face.height,
        faceTextures: {},
        faceImageSizes: {},
        imageWidth: frontMeta?.width,
        imageHeight: frontMeta?.height,
        sizeScale: 1,
        materials,
        printParams,
        materialResolver: this.materialResolver,
      });
    } else if (isHandheldAssetKind(assetKind) && handheldParams) {
      populateAssetGroup(root, assetKind, {
        faceWidth: face.width,
        faceHeight: face.height,
        imageWidth: frontMeta?.width,
        imageHeight: frontMeta?.height,
        sizeScale: 1,
        materials,
        materialResolver: this.materialResolver,
        handheldParams,
        assetKind,
      });
    } else if (isMonitorAssetKind(assetKind) && monitorParams) {
      populateAssetGroup(root, assetKind, {
        faceWidth: face.width,
        faceHeight: face.height,
        imageWidth: frontMeta?.width,
        imageHeight: frontMeta?.height,
        sizeScale: 1,
        materials,
        materialResolver: this.materialResolver,
        monitorParams,
        geometryVisibility: definition.getGeometryVisibilityDefaults(),
      });
    } else if (isWallAssetKind(assetKind)) {
      populateAssetGroup(root, assetKind, {
        sizeScale: 1,
        materials,
        materialResolver: this.materialResolver,
        wallParams: defaultWallParams(),
        wallpaperPattern: defaultWallpaperPattern(),
        assetKind,
      });
    } else if (isBlockAssetKind(assetKind)) {
      populateAssetGroup(root, assetKind, {
        sizeScale: 1,
        materials,
        materialResolver: this.materialResolver,
        blockParams: defaultBlockParams(),
      });
    } else if (usesAsyncPackagingRebuild(assetKind)) {
      // Meshes built asynchronously in rebuildEntity.
    } else {
      populateAssetGroup(root, assetKind, {
        imageWidth: frontMeta?.width,
        imageHeight: frontMeta?.height,
        sizeScale: 1,
        materials,
        materialResolver: this.materialResolver,
      });
    }

    this.scene.add(root);
    this.registry.addEntity(
      id,
      assetKind,
      root,
      transform,
      frontImageId,
      faces,
      depth,
      materials,
      handheldParams ?? monitorParams,
      usesAsyncPackagingRebuild(assetKind)
        ? definition.getGeometryVisibilityDefaults()
        : undefined,
      printParams,
    );
    if (usesAsyncPackagingRebuild(assetKind)) {
      void this.rebuildEntity(id);
    }
    return id;
  }

  seedDefaultScene(): void {
    for (const entry of DEFAULT_SCENE_ASSETS) {
      this.addAsset(entry.assetKind, entry.position);
    }
    this.registry.reserveSpawnSlots(DEFAULT_SCENE_ASSETS.length);
  }

  async setAssetImage(entityId: string, imageId: string | null): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) return;

    const { assetKind } = runtime.entity;
    const root = runtime.object as Group;

    if (isPrintAssetKind(assetKind) && runtime.entity.faces) {
      const footY = footWorldY(runtime.entity, this.imageResolver);
      this.registry.setAssetFaceContent(entityId, 'front', {
        mode: 'image',
        imageId,
      });

      const updated = this.registry.getRuntime(entityId);
      if (!updated?.entity.faces || updated.entity.depth === undefined) return;

      await this.rebuildFacetedAsset(root, updated.entity);
      this.syncEntityYForFoot(entityId, footY);
      return;
    }

    this.registry.setScreenImageId(entityId, imageId);

    if (isWallAssetKind(assetKind) && imageId) {
      const meta = this.imageResolver?.(imageId);
      if (meta && meta.width > 0 && meta.height > 0) {
        const pattern = migrateWallpaperPattern(runtime.entity.wallpaperPattern);
        this.registry.setWallpaperPattern(entityId, {
          stripHeightM: wallpaperStripHeightM(
            pattern.stripWidthM,
            meta.width,
            meta.height,
          ),
        });
      }
    }

    await this.rebuildEntity(entityId);
  }

  async setAssetFace(
    entityId: string,
    faceId: AssetFaceId,
    content: AssetFaceContent,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (
      !runtime ||
      !isPrintAssetKind(runtime.entity.assetKind) ||
      !runtime.entity.faces ||
      runtime.entity.depth === undefined
    ) {
      return;
    }

    const footY = footWorldY(runtime.entity, this.imageResolver);
    this.registry.setAssetFaceContent(entityId, faceId, content);
    const updated = this.registry.getRuntime(entityId);
    if (!updated?.entity.faces || updated.entity.depth === undefined) return;

    await this.rebuildFacetedAsset(
      runtime.object as Group,
      updated.entity,
    );
    this.syncEntityYForFoot(entityId, footY);
  }

  async setAssetDepth(entityId: string, depth: number): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (
      !runtime ||
      !isPrintAssetKind(runtime.entity.assetKind) ||
      !runtime.entity.faces ||
      runtime.entity.depth === undefined
    ) {
      return;
    }

    const footY = footWorldY(runtime.entity, this.imageResolver);
    this.registry.setAssetDepth(entityId, depth);
    const updated = this.registry.getRuntime(entityId);
    if (!updated?.entity.faces || updated.entity.depth === undefined) return;

    await this.rebuildFacetedAsset(
      runtime.object as Group,
      updated.entity,
    );
    this.syncEntityYForFoot(entityId, footY);
  }

  async setAssetSizeScale(entityId: string, sizeScale: number): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (
      !runtime ||
      isWallAssetKind(runtime.entity.assetKind) ||
      isBlockAssetKind(runtime.entity.assetKind)
    ) {
      return;
    }

    this.registry.setSizeScale(entityId, clampSizeScale(sizeScale));
    await this.rebuildEntity(entityId);
  }

  async setHandheldParams(
    entityId: string,
    partial: Partial<HandheldDeviceParams>,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isHandheldAssetKind(runtime.entity.assetKind)) return;

    this.registry.setHandheldParams(entityId, partial);
    await this.rebuildEntity(entityId);
  }

  async setMonitorParams(
    entityId: string,
    partial: Partial<MonitorDeviceParams>,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isMonitorAssetKind(runtime.entity.assetKind)) return;

    this.registry.setMonitorParams(entityId, partial);
    await this.rebuildEntity(entityId);
  }

  async setPrintParams(
    entityId: string,
    partial: Partial<PrintDeviceParams>,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (
      !runtime ||
      !isPrintAssetKind(runtime.entity.assetKind) ||
      !runtime.entity.faces ||
      runtime.entity.depth === undefined
    ) {
      return;
    }

    const footY = footWorldY(runtime.entity, this.imageResolver);
    this.registry.setPrintParams(entityId, partial);
    const updated = this.registry.getRuntime(entityId);
    if (!updated?.entity.faces || updated.entity.depth === undefined) return;

    await this.rebuildFacetedAsset(
      runtime.object as Group,
      updated.entity,
    );
    this.syncEntityYForFoot(entityId, footY);
  }

  async setWallParams(entityId: string, partial: Partial<WallParams>): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isWallAssetKind(runtime.entity.assetKind)) return;

    this.registry.setWallParams(entityId, partial);
    await this.rebuildEntity(entityId);
  }

  async setWallpaperPattern(
    entityId: string,
    partial: Partial<WallpaperPattern>,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isWallAssetKind(runtime.entity.assetKind)) return;

    this.registry.setWallpaperPattern(entityId, partial);
    await this.rebuildEntity(entityId);
  }

  async setBlockParams(entityId: string, partial: Partial<BlockParams>): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isBlockAssetKind(runtime.entity.assetKind)) return;

    this.registry.setBlockParams(entityId, partial);
    await this.rebuildEntity(entityId);
  }

  async setBeverageCanParams(
    entityId: string,
    partial: Partial<BeverageCanParams>,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isBeverageCanAssetKind(runtime.entity.assetKind)) return;

    this.registry.setBeverageCanParams(entityId, partial);
    await this.rebuildEntity(entityId);
  }

  async setTinCanParams(
    entityId: string,
    partial: Partial<TinCanParams>,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isTinCanAssetKind(runtime.entity.assetKind)) return;

    this.registry.setTinCanParams(entityId, partial);
    await this.rebuildEntity(entityId);
  }

  async setWineBottleParams(
    entityId: string,
    partial: Partial<WineBottleParams>,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isWineBottleAssetKind(runtime.entity.assetKind)) return;

    this.registry.setWineBottleParams(entityId, partial);
    await this.rebuildEntity(entityId);
  }

  async setEntityMaterial(
    entityId: string,
    slot: MaterialEntitySlot,
    materialId: string,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) return;

    this.registry.setEntityMaterialSlot(entityId, slot, materialId);
    await this.rebuildEntity(entityId);
  }

  async setFaceTint(
    entityId: string,
    faceId: AssetFaceId,
    tint: Rgb,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isPrintAssetKind(runtime.entity.assetKind)) return;

    this.registry.setFaceTint(entityId, faceId, tint);
    await this.rebuildEntity(entityId);
  }

  async setGeometryVisible(
    entityId: string,
    part: AssetGeometryPart,
    visible: boolean,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (
      !runtime ||
      (runtime.entity.assetKind !== 'picture' &&
        !isHandheldAssetKind(runtime.entity.assetKind) &&
        !isMonitorAssetKind(runtime.entity.assetKind) &&
        !usesAsyncPackagingRebuild(runtime.entity.assetKind))
    ) {
      return;
    }

    this.registry.setGeometryVisible(entityId, part, visible);
    await this.rebuildEntity(entityId);
  }

  invalidateMaterial(materialId: string): void {
    this.materialResolver.invalidate(materialId);

    for (const entity of this.registry.getEntities()) {
      if (entityUsesMaterial(entity, materialId)) {
        void this.rebuildEntity(entity.id);
      }
    }
  }

  rebuildAllEntities(): void {
    for (const entity of this.registry.getEntities()) {
      void this.rebuildEntity(entity.id);
    }
  }

  removeAsset(entityId: string): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) return;

    disposeAssetGroup(runtime.object as Group);
    this.scene.remove(runtime.object);
    this.registry.removeEntity(entityId);
  }

  dispose(): void {
    this.viewportInvalidation = null;
    for (const runtime of this.registry.getEntities()) {
      const objectRuntime = this.registry.getRuntime(runtime.id);
      if (!objectRuntime) continue;
      disposeAssetGroup(objectRuntime.object as Group);
      this.scene.remove(objectRuntime.object);
    }
    this.textureLoader.dispose();
    this.materialResolver.invalidate();
  }

  private async rebuildEntity(entityId: string): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) return;

    const footY = footWorldY(runtime.entity, this.imageResolver);

    try {
    if (isPrintAssetKind(runtime.entity.assetKind)) {
      const faces = runtime.entity.faces;
      const depth = runtime.entity.depth;
      if (!faces || depth === undefined) return;

      await this.rebuildFacetedAsset(
        runtime.object as Group,
        runtime.entity,
      );
      this.syncEntityYForFoot(entityId, footY);
      return;
    }

    if (runtime.entity.assetKind === 'picture') {
      await this.rebuildPicture(runtime.object as Group, runtime.entity);
      this.syncEntityYForFoot(entityId, footY);
      return;
    }

    if (isHandheldAssetKind(runtime.entity.assetKind)) {
      await this.rebuildHandheld(runtime.object as Group, runtime.entity);
      this.syncEntityYForFoot(entityId, footY);
      return;
    }

    if (isMonitorAssetKind(runtime.entity.assetKind)) {
      await this.rebuildMonitor(runtime.object as Group, runtime.entity);
      this.syncEntityYForFoot(entityId, footY);
      return;
    }

    if (isWallAssetKind(runtime.entity.assetKind)) {
      await this.rebuildWall(runtime.object as Group, runtime.entity);
      this.syncEntityYForFoot(entityId, footY);
      return;
    }

    if (isBlockAssetKind(runtime.entity.assetKind)) {
      await this.rebuildBlock(runtime.object as Group, runtime.entity);
      this.syncEntityYForFoot(entityId, footY);
      return;
    }

    if (usesAsyncPackagingRebuild(runtime.entity.assetKind)) {
      await this.rebuildPackagingAsset(runtime.object as Group, runtime.entity);
      this.syncEntityYForFoot(entityId, footY);
    }
    } finally {
      this.viewportInvalidation?.invalidate();
    }
  }

  private syncEntityYForFoot(entityId: string, footY: number): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) return;

    const nextY = transformYForFootWorldY(
      runtime.entity,
      footY,
      this.imageResolver,
    );
    const currentY = runtime.entity.transform.position.y;
    if (Math.abs(nextY - currentY) <= 1e-6) return;

    this.registry.updateTransform(entityId, {
      position: {
        ...runtime.entity.transform.position,
        y: nextY,
      },
    });
  }

  private async rebuildPackagingAsset(root: Group, entity: AssetEntity): Promise<void> {
    switch (entity.assetKind) {
      case 'beverage-can':
        await this.rebuildBeverageCan(root, entity);
        return;
      case 'tin-can':
        await this.rebuildTinCan(root, entity);
        return;
      case 'wine-bottle':
        await this.rebuildWineBottle(root, entity);
        return;
    }
  }

  private async rebuildBeverageCan(root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = this.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
        imageTexture = await this.textureLoader.load(entity.screenImageId);
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
      materialResolver: this.materialResolver,
      imageSurfaces: entity.imageSurfaces,
      assetKind: 'beverage-can',
    });
  }

  private async rebuildTinCan(root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = this.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
        imageTexture = await this.textureLoader.load(entity.screenImageId);
      }
    }

    const definition = getAssetKindDefinition(entity.assetKind);
    const materials = entity.materials ?? definition.getDefaultMaterials();

    await populateTinCanGroup(root, {
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
      materialResolver: this.materialResolver,
      imageSurfaces: entity.imageSurfaces,
      assetKind: 'tin-can',
    });
  }

  private async rebuildWineBottle(root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = this.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
        imageTexture = await this.textureLoader.load(entity.screenImageId);
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
      materialResolver: this.materialResolver,
      imageSurfaces: entity.imageSurfaces,
      assetKind: 'wine-bottle',
    });
  }

  private async rebuildFacetedAsset(
    root: Group,
    entity: AssetEntity,
  ): Promise<void> {
    const faces = entity.faces;
    const depth = entity.depth;
    if (!faces || depth === undefined) return;

    const face = computeEntityFaceSize(entity, this.imageResolver);
    const { faceTextures, faceImageSizes } = await this.loadFaceTextures(faces);
    const frontImageId = faces.front.mode === 'image' ? faces.front.imageId : null;
    const frontMeta = frontImageId ? this.imageResolver?.(frontImageId) : null;
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
      materialResolver: this.materialResolver,
      imageSurfaces: entity.imageSurfaces,
    });
  }

  private async rebuildPicture(root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = this.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
        imageTexture = await this.textureLoader.load(entity.screenImageId);
      }
    }

    const face = computeEntityFaceSize(entity, this.imageResolver);
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
      materialResolver: this.materialResolver,
      imageSurfaces: entity.imageSurfaces,
    });
  }

  private async rebuildWall(root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = this.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
      }
      imageTexture = await this.textureLoader.load(entity.screenImageId);
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
      materialResolver: this.materialResolver,
      wallParams,
      wallpaperPattern,
      assetKind: entity.assetKind,
      imageSurfaces: entity.imageSurfaces,
    });
  }

  private async rebuildBlock(root: Group, entity: AssetEntity): Promise<void> {
    const definition = getAssetKindDefinition(entity.assetKind);
    const materials = entity.materials ?? definition.getDefaultMaterials();
    const blockParams = entity.blockParams ?? defaultBlockParams();

    populateAssetGroup(root, 'block', {
      materials,
      materialResolver: this.materialResolver,
      blockParams,
    });
  }

  private async rebuildHandheld(root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = this.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
        imageTexture = await this.textureLoader.load(entity.screenImageId);
      }
    }

    const face = computeEntityFaceSize(entity, this.imageResolver);
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
      materialResolver: this.materialResolver,
      handheldParams,
      assetKind: entity.assetKind,
      imageSurfaces: entity.imageSurfaces,
    });
  }

  private async rebuildMonitor(root: Group, entity: AssetEntity): Promise<void> {
    let imageTexture = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (entity.screenImageId) {
      const meta = this.imageResolver?.(entity.screenImageId);
      if (meta) {
        imageWidth = meta.width;
        imageHeight = meta.height;
        imageTexture = await this.textureLoader.load(entity.screenImageId);
      }
    }

    const face = computeEntityFaceSize(entity, this.imageResolver);
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
      materialResolver: this.materialResolver,
      monitorParams,
      imageSurfaces: entity.imageSurfaces,
    });
  }

  async setImageSurface(
    entityId: string,
    faceId: AssetImageSurfaceId,
    partial: Partial<ImageSurfaceSettings>,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) return;

    this.registry.setImageSurface(entityId, faceId, partial);
    await this.rebuildEntity(entityId);
  }

  private async loadFaceTextures(
    faces: AssetFaces,
  ): Promise<{
    faceTextures: Partial<Record<AssetFaceId, Texture | null>>;
    faceImageSizes: Partial<Record<AssetFaceId, ImageSize | null>>;
  }> {
    const faceTextures: Partial<Record<AssetFaceId, Texture | null>> = {};
    const faceImageSizes: Partial<Record<AssetFaceId, ImageSize | null>> = {};

    for (const [faceId, content] of Object.entries(faces) as [AssetFaceId, AssetFaceContent][]) {
      if (content.mode === 'image' && content.imageId) {
        const meta = this.imageResolver?.(content.imageId);
        if (meta) {
          faceImageSizes[faceId] = { width: meta.width, height: meta.height };
        }
        faceTextures[faceId] = await this.textureLoader.load(content.imageId);
      }
    }

    return { faceTextures, faceImageSizes };
  }
}

function entityUsesMaterial(entity: AssetEntity, materialId: string): boolean {
  const slots = entity.materials;
  if (!slots) return false;

  return (
    slots.frameMaterialId === materialId ||
    slots.backWallMaterialId === materialId ||
    slots.backGlassMaterialId === materialId ||
    slots.sideButtonMaterialId === materialId ||
    slots.standBaseMaterialId === materialId ||
    slots.standFootMaterialId === materialId ||
    slots.glazingMaterialId === materialId ||
    slots.frontMaterialId === materialId ||
    slots.backMaterialId === materialId ||
    slots.sideMaterialId === materialId ||
    slots.wallMaterialId === materialId ||
    slots.blockMaterialId === materialId ||
    slots.metalMaterialId === materialId ||
    slots.glassMaterialId === materialId ||
    slots.corkMaterialId === materialId ||
    slots.capsuleFoilMaterialId === materialId ||
    slots.capsuleDiscMaterialId === materialId
  );
}
