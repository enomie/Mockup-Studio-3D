import { Group, type Material, type Scene } from 'three/webgpu';
import {
  isRotationalPrintAssetKind,
  resolveRotationalPrintSettings,
  ROTATIONAL_PRINT_UNIFORM_FIELDS,
} from '@/scene/rotational-print';
import { updateRotationalPrintMaterial } from './rotational-print-material';
import {
  kindAcceptsParamFamily,
  type KindParamsByFamily,
  type RebuildOnlyKindParamFamily,
} from '@/scene/kind-param-families';
import {
  defaultHandheldParams,
  isHandheldAssetKind,
} from '@/scene/asset-handheld';
import {
  defaultMonitorParams,
  isMonitorAssetKind,
} from '@/scene/asset-monitor';
import {
  defaultFacesForKind,
  isPrintAssetKind,
  type AssetFaceContent,
  type AssetFaceId,
} from '@/scene/asset-faces';
import type {
  AssetEntity,
  AssetGeometryPart,
  AssetImageSurfaceId,
  AssetKind,
  FabricClothParams,
  ImageResolver,
  MaterialEntitySlot,
  PrintDeviceParams,
} from '@/scene/entity-types';
import {
  getAssetKindDefinition,
  getDefaultEntitySliceForKind,
  usesAsyncPackagingRebuild,
} from '@/scene/asset-kind-registry';
import { defaultPrintParams } from '@/scene/asset-print';
import {
  defaultBlockParams,
  isBlockAssetKind,
} from '@/scene/asset-block';
import {
  defaultCylinderParams,
  isCylinderAssetKind,
} from '@/scene/asset-cylinder';
import {
  defaultSphereParams,
  isSphereAssetKind,
} from '@/scene/asset-sphere';
import {
  defaultPatchParamsForKind,
  isPatchAssetKind,
} from '@/scene/asset-triangle-patch';
import { isWheelCarAssetKind } from '@/scene/asset-wheel-car';
import { isRigidPrimitiveAssetKind } from '@/scene/rigid-primitive-asset';
import {
  resolvePhysicsBodyMode,
  type PhysicsBodyMode,
} from '@/scene/physics-rigid-body';
import {
  cloneFabricClothParams,
  defaultFabricClothParams,
  fabricClothFootprintFromSizes,
  isFabricClothAssetKind,
  isFabricClothBakedAssetKind,
  isFabricClothFamilyAssetKind,
  isFabricRuntimeTuningPatch,
} from '@/scene/asset-fabric-cloth';
import { fabricClothPhysicsParamsFromMaterialId } from '@/config/fabric-physics-presets';
import { cloneAssetMaterials } from '@/scene/material-types';
import type {
  UserBakedAsset,
  UserBakedAssetResolver,
} from '@/scene/user-baked-asset';
import { normalizeFabricClothBakedMeshPayload } from '@/engine/fabric-cloth-bake';
import {
  defaultBookParams,
  isBookAssetKind,
} from '@/scene/asset-book';
import type { BookMaterialTintPart } from '@/scene/book-material-tints';
import type { Rgb } from '@/colors/rgb';
import {
  defaultWallParams,
  defaultWallpaperPattern,
  isWallAssetKind,
  migrateWallpaperPattern,
  wallpaperStripHeightM,
  type WallpaperPattern,
} from '@/scene/asset-wall';
import { resolveImageSurfaceSettings, type ImageSurfaceSettings } from '@/scene/image-surface';
import {
  assetGroundCenterY,
  clampSizeScale,
  computeFaceSize,
  defaultDepth,
  footWorldY,
} from '@/scene/asset-sizing';
import { disposeAssetGroup, populateAssetGroup } from './asset-meshes/index';
import type { EntityRegistry } from './entity-registry';
import type { ImageTextureLoader } from './image-texture-loader';
import { MaterialResolver } from './material-resolver';
import {
  DEFAULT_SCENE_ASSETS,
  type DefaultSceneAsset,
} from '@/config/default-scene-assets';
import type { ViewportInvalidation } from './viewport-invalidation';
import {
  type AssetRebuildContext,
  rebuildEntity,
  rebuildFacetedAsset,
  syncEntityYForFoot,
} from './asset-system-rebuild';
import type { RigidPrimitivePhysicsColliders } from './rigid-primitive-physics-colliders';
import type { FabricClothSimulationParticipant } from './fabric-cloth-simulation-participant';


export class AssetSystem {
  private readonly scene: Scene;
  private readonly registry: EntityRegistry;
  private readonly textureLoader: ImageTextureLoader;
  private readonly materialResolver = new MaterialResolver();
  private imageResolver: ImageResolver | null = null;
  private viewportInvalidation: ViewportInvalidation | null = null;
  private rigidPrimitivePhysics: RigidPrimitivePhysicsColliders | null = null;
  private fabricClothSimulation: FabricClothSimulationParticipant | null = null;
  private userBakedAssetResolver: UserBakedAssetResolver | null = null;

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

  setRigidPrimitivePhysicsColliders(colliders: RigidPrimitivePhysicsColliders | null): void {
    this.rigidPrimitivePhysics = colliders;
  }

  setFabricClothSimulationParticipant(
    participant: FabricClothSimulationParticipant | null,
  ): void {
    this.fabricClothSimulation = participant;
  }

  setUserBakedAssetResolver(resolver: UserBakedAssetResolver | null): void {
    this.userBakedAssetResolver = resolver;
  }

  getImageResolver(): ImageResolver | null {
    return this.imageResolver;
  }

  setImageResolver(resolver: ImageResolver | null): void {
    this.imageResolver = resolver;
    this.textureLoader.setResolver(resolver);
  }

  private get rebuildCtx(): AssetRebuildContext {
    return {
      registry: this.registry,
      textureLoader: this.textureLoader,
      materialResolver: this.materialResolver,
      imageResolver: this.imageResolver,
      viewportInvalidation: this.viewportInvalidation,
      rigidPrimitivePhysics: this.rigidPrimitivePhysics,
      fabricClothSimulation: this.fabricClothSimulation,
      userBakedAssetResolver: this.userBakedAssetResolver,
    };
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

    const fabricClothSpawnParams = isFabricClothAssetKind(assetKind)
      ? {
          ...defaultFabricClothParams(
            fabricClothFootprintFromSizes(face.width, face.height),
          ),
          physics: fabricClothPhysicsParamsFromMaterialId(
            materials.fabricClothMaterialId ?? 'material-fabric',
          ),
        }
      : undefined;

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
    } else if (isCylinderAssetKind(assetKind)) {
      populateAssetGroup(root, assetKind, {
        sizeScale: 1,
        materials,
        materialResolver: this.materialResolver,
        cylinderParams: defaultCylinderParams(),
      });
    } else if (isSphereAssetKind(assetKind)) {
      populateAssetGroup(root, assetKind, {
        sizeScale: 1,
        materials,
        materialResolver: this.materialResolver,
        sphereParams: defaultSphereParams(),
      });
    } else if (isPatchAssetKind(assetKind)) {
      populateAssetGroup(root, assetKind, {
        sizeScale: 1,
        materials,
        materialResolver: this.materialResolver,
        patchParams:
          kindDefaults.patchParams ?? defaultPatchParamsForKind(assetKind),
      });
    } else if (isWheelCarAssetKind(assetKind)) {
      // Meshes built asynchronously in rebuildEntity (SVG lathe).
    } else if (isFabricClothAssetKind(assetKind)) {
      populateAssetGroup(root, assetKind, {
        faceWidth: face.width,
        faceHeight: face.height,
        sizeScale: 1,
        materials,
        materialResolver: this.materialResolver,
        fabricClothParams:
          kindDefaults.fabricClothParams ?? defaultFabricClothParams(),
      });
    } else if (isBookAssetKind(assetKind)) {
      populateAssetGroup(root, assetKind, {
        faceWidth: face.width,
        faceHeight: face.height,
        sizeScale: 1,
        materials,
        materialResolver: this.materialResolver,
        bookParams: kindDefaults.bookParams ?? defaultBookParams(assetKind),
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
    if (fabricClothSpawnParams) {
      this.registry.setKindParams('fabricCloth', id, fabricClothSpawnParams);
    }
    if (usesAsyncPackagingRebuild(assetKind)) {
      void rebuildEntity(this.rebuildCtx, id);
    } else if (isBookAssetKind(assetKind)) {
      void rebuildEntity(this.rebuildCtx, id);
    } else if (isWheelCarAssetKind(assetKind)) {
      void rebuildEntity(this.rebuildCtx, id);
    } else if (isRigidPrimitiveAssetKind(assetKind)) {
      this.rigidPrimitivePhysics?.reconcileEntity(id);
    }
    return id;
  }

  rebuildEntity(entityId: string): Promise<void> {
    return rebuildEntity(this.rebuildCtx, entityId);
  }

  seedDefaultScene(): void {
    for (const entry of DEFAULT_SCENE_ASSETS) {
      const id = this.addAsset(entry.assetKind, entry.position);
      this.applyDefaultSceneAssetOverrides(id, entry);
    }
    this.registry.reserveSpawnSlots(DEFAULT_SCENE_ASSETS.length);
  }

  private applyDefaultSceneAssetOverrides(
    entityId: string,
    entry: DefaultSceneAsset,
  ): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) {return;}

    if (entry.positionY !== undefined) {
      const { x, z } = runtime.entity.transform.position;
      this.registry.updateTransform(entityId, {
        position: { x, y: entry.positionY, z },
      });
      if (
        isRigidPrimitiveAssetKind(runtime.entity.assetKind) &&
        resolvePhysicsBodyMode(runtime.entity) === 'fixed'
      ) {
        this.rigidPrimitivePhysics?.syncPoseFromRuntime(entityId);
      }
    }

    if (entry.materialSlot && entry.materialId) {
      this.registry.setEntityMaterialSlot(
        entityId,
        entry.materialSlot,
        entry.materialId,
      );
      void rebuildEntity(this.rebuildCtx, entityId);
    }

    if (entry.screenImageId) {
      void this.setAssetImage(entityId, entry.screenImageId);
    }
  }

  async setAssetImage(entityId: string, imageId: string | null): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) {return;}

    const { assetKind } = runtime.entity;
    const root = runtime.object as Group;

    if (isPrintAssetKind(assetKind) && runtime.entity.faces) {
      const footY = footWorldY(runtime.entity, this.imageResolver);
      this.registry.setAssetFaceContent(entityId, 'front', {
        mode: 'image',
        imageId,
      });

      const updated = this.registry.getRuntime(entityId);
      if (!updated?.entity.faces || updated.entity.depth === undefined) {return;}

      await rebuildFacetedAsset(this.rebuildCtx, root, updated.entity);
      syncEntityYForFoot(this.rebuildCtx, entityId, footY);
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

    await rebuildEntity(this.rebuildCtx, entityId);
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
    if (!updated?.entity.faces || updated.entity.depth === undefined) {return;}

    await rebuildFacetedAsset(
      this.rebuildCtx,
      runtime.object as Group,
      updated.entity,
    );
    syncEntityYForFoot(this.rebuildCtx, entityId, footY);
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
    if (!updated?.entity.faces || updated.entity.depth === undefined) {return;}

    await rebuildFacetedAsset(
      this.rebuildCtx,
      runtime.object as Group,
      updated.entity,
    );
    syncEntityYForFoot(this.rebuildCtx, entityId, footY);
  }

  async setAssetSizeScale(entityId: string, sizeScale: number): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (
      !runtime ||
      isWallAssetKind(runtime.entity.assetKind) ||
      isRigidPrimitiveAssetKind(runtime.entity.assetKind) ||
      isFabricClothBakedAssetKind(runtime.entity.assetKind)
    ) {
      return;
    }

    this.registry.setSizeScale(entityId, clampSizeScale(sizeScale));
    await rebuildEntity(this.rebuildCtx, entityId);
  }

  async applyRigidPrimitiveUniformScale(
    entityId: string,
    factor: number,
  ): Promise<void> {
    if (!this.registry.applyRigidPrimitiveUniformScale(entityId, factor)) {
      return;
    }
    await rebuildEntity(this.rebuildCtx, entityId);
  }

  /**
   * Patches kind params and rebuilds the entity. Print and fabric cloth have
   * extra behavior and use setPrintParams / setFabricClothParams instead.
   */
  async setKindParams<F extends RebuildOnlyKindParamFamily>(
    family: F,
    entityId: string,
    partial: Partial<KindParamsByFamily[F]>,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !kindAcceptsParamFamily(runtime.entity.assetKind, family)) {return;}

    this.registry.setKindParams(family, entityId, partial);
    await rebuildEntity(this.rebuildCtx, entityId);
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
    this.registry.setKindParams('print', entityId, partial);
    const updated = this.registry.getRuntime(entityId);
    if (!updated?.entity.faces || updated.entity.depth === undefined) {return;}

    await rebuildFacetedAsset(
      this.rebuildCtx,
      runtime.object as Group,
      updated.entity,
    );
    syncEntityYForFoot(this.rebuildCtx, entityId, footY);
  }

  async setWallpaperPattern(
    entityId: string,
    partial: Partial<WallpaperPattern>,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isWallAssetKind(runtime.entity.assetKind)) {return;}

    this.registry.setWallpaperPattern(entityId, partial);
    await rebuildEntity(this.rebuildCtx, entityId);
  }

  setPhysicsBodyMode(entityId: string, mode: PhysicsBodyMode): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) {return;}

    this.registry.setPhysicsBodyMode(entityId, mode);
    if (isRigidPrimitiveAssetKind(runtime.entity.assetKind)) {
      this.rigidPrimitivePhysics?.reconcileEntity(entityId);
    }
  }

  setPhysicsDensityKgPerM3(entityId: string, densityKgPerM3: number): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) {return;}

    this.registry.setPhysicsDensityKgPerM3(entityId, densityKgPerM3);
    if (isRigidPrimitiveAssetKind(runtime.entity.assetKind)) {
      this.rigidPrimitivePhysics?.reconcileEntity(entityId);
    }
  }

  async setFabricClothParams(
    entityId: string,
    partial: Partial<FabricClothParams>,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isFabricClothFamilyAssetKind(runtime.entity.assetKind)) {return;}

    const prevCount =
      runtime.entity.fabricClothParams?.sim.pinnedCornersCount ?? 0;
    const runtimeTuning = isFabricRuntimeTuningPatch(partial);

    this.registry.setKindParams('fabricCloth', entityId, partial);
    const nextSim = runtime.entity.fabricClothParams?.sim;
    if (partial.sim !== undefined && nextSim) {
      this.fabricClothSimulation?.onSimPinsChanged(entityId, prevCount, nextSim);
    }
    if (partial.physics !== undefined) {
      this.fabricClothSimulation?.wakeSimulation(entityId);
    }
    if (runtimeTuning) {
      return;
    }
    await rebuildEntity(this.rebuildCtx, entityId);
  }

  addAssetFromUserBaked(userAsset: UserBakedAsset, spawn?: { x: number; z: number }): string {
    const assetKind = userAsset.placementKind;
    const id = crypto.randomUUID();
    const materials = cloneAssetMaterials(userAsset.defaults.materials);
    const fabricClothParams = cloneFabricClothParams(userAsset.defaults.fabricClothParams);
    const normalizedMesh = normalizeFabricClothBakedMeshPayload(userAsset.mesh);
    const footprint = {
      widthM: normalizedMesh.planeWidthM,
      heightM: normalizedMesh.planeHeightM,
    };
    const face = {
      width: footprint.widthM,
      height: footprint.heightM,
    };
    const spawnEntity: AssetEntity = {
      id,
      type: 'asset',
      name: userAsset.name,
      assetKind,
      screenImageId: userAsset.defaults.screenImageId,
      sizeScale: 1,
      visible: true,
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      bakedClothFootprint: footprint,
    };
    const spawnY = assetGroundCenterY(assetKind, face, 1, spawnEntity);
    const transform = spawn
      ? this.registry.createTransformAt(spawn.x, spawn.z, spawnY)
      : this.registry.createSpawnTransform(spawnY);

    const root = new Group();
    root.userData.entityId = id;

    populateAssetGroup(root, assetKind, {
      faceWidth: face.width,
      faceHeight: face.height,
      materials,
      materialResolver: this.materialResolver,
      fabricClothParams,
      bakedFabricClothMesh: userAsset.mesh,
      imageTexture: null,
    });

    this.scene.add(root);
    this.registry.addEntity(
      id,
      assetKind,
      root,
      transform,
      userAsset.defaults.screenImageId,
      undefined,
      undefined,
      materials,
    );
    this.registry.patchEntityFields(id, {
      userBakedAssetId: userAsset.id,
      bakedClothFootprint: footprint,
      fabricClothParams,
      name: userAsset.name,
    });

    if (userAsset.defaults.screenImageId) {
      void this.setAssetImage(id, userAsset.defaults.screenImageId);
    }

    return id;
  }

  async setBookBackCoverImageId(entityId: string, imageId: string | null): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isBookAssetKind(runtime.entity.assetKind)) {return;}

    this.registry.setBookBackCoverImageId(entityId, imageId);
    await rebuildEntity(this.rebuildCtx, entityId);
  }

  async setBookSpineImageId(entityId: string, imageId: string | null): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isBookAssetKind(runtime.entity.assetKind)) {return;}

    this.registry.setBookSpineImageId(entityId, imageId);
    await rebuildEntity(this.rebuildCtx, entityId);
  }

  async setBookMaterialTint(
    entityId: string,
    part: BookMaterialTintPart,
    tint: Rgb,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isBookAssetKind(runtime.entity.assetKind)) {return;}

    this.registry.setBookMaterialTint(entityId, part, tint);
    await rebuildEntity(this.rebuildCtx, entityId);
  }

  async setEntityMaterial(
    entityId: string,
    slot: MaterialEntitySlot,
    materialId: string,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) {return;}

    this.registry.setEntityMaterialSlot(entityId, slot, materialId);
    await rebuildEntity(this.rebuildCtx, entityId);
  }

  async setFaceTint(
    entityId: string,
    faceId: AssetFaceId,
    tint: Rgb,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isPrintAssetKind(runtime.entity.assetKind)) {return;}

    this.registry.setFaceTint(entityId, faceId, tint);
    await rebuildEntity(this.rebuildCtx, entityId);
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
    await rebuildEntity(this.rebuildCtx, entityId);
  }

  invalidateMaterial(materialId: string): void {
    this.materialResolver.invalidate(materialId);

    for (const entity of this.registry.getEntities()) {
      if (entityUsesMaterial(entity, materialId)) {
        void rebuildEntity(this.rebuildCtx, entity.id);
      }
    }
  }

  rebuildAllEntities(): void {
    for (const entity of this.registry.getEntities()) {
      void rebuildEntity(this.rebuildCtx, entity.id);
    }
  }

  removeAsset(entityId: string): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) {return;}

    this.rigidPrimitivePhysics?.remove(entityId);
    this.fabricClothSimulation?.removeOne(entityId);
    disposeAssetGroup(runtime.object as Group);
    this.scene.remove(runtime.object);
    this.registry.removeEntity(entityId);
  }

  dispose(): void {
    this.viewportInvalidation = null;
    this.rigidPrimitivePhysics?.dispose();
    this.fabricClothSimulation?.dispose();
    for (const runtime of this.registry.getEntities()) {
      const objectRuntime = this.registry.getRuntime(runtime.id);
      if (!objectRuntime) {continue;}
      disposeAssetGroup(objectRuntime.object as Group);
      this.scene.remove(objectRuntime.object);
    }
    this.textureLoader.dispose();
    this.materialResolver.invalidate();
  }

  async setImageSurface(
    entityId: string,
    faceId: AssetImageSurfaceId,
    partial: Partial<ImageSurfaceSettings>,
  ): Promise<void> {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime) {return;}

    this.registry.setImageSurface(entityId, faceId, partial);
    if (this.applyPrintUniformsInPlace(entityId, faceId, partial)) {return;}
    await rebuildEntity(this.rebuildCtx, entityId);
  }

  /** Slider-only changes on a rotational print update shader uniforms instead of rebuilding. */
  private applyPrintUniformsInPlace(
    entityId: string,
    faceId: AssetImageSurfaceId,
    partial: Partial<ImageSurfaceSettings>,
  ): boolean {
    const runtime = this.registry.getRuntime(entityId);
    const assetKind = runtime?.entity.assetKind;
    if (!runtime || !assetKind || !isRotationalPrintAssetKind(assetKind)) {return false;}
    const keys = Object.keys(partial);
    const uniformFields: readonly string[] = ROTATIONAL_PRINT_UNIFORM_FIELDS;
    if (keys.length === 0 || !keys.every((key) => uniformFields.includes(key))) {return false;}

    const settings = resolveRotationalPrintSettings(
      resolveImageSurfaceSettings(runtime.entity.imageSurfaces, faceId, { assetKind }),
      assetKind,
    );
    const materials: Material[] = [];
    runtime.object.traverse((child) => {
      const material = (child as { material?: Material | Material[] }).material;
      if (material) {materials.push(...(Array.isArray(material) ? material : [material]));}
    });
    const updated = materials
      .map((material) => updateRotationalPrintMaterial(material, settings))
      .some(Boolean);
    if (updated) {
      this.viewportInvalidation?.invalidate();
    }
    return updated;
  }
}

function entityUsesMaterial(entity: AssetEntity, materialId: string): boolean {
  const slots = entity.materials;
  if (!slots) {return false;}

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
    slots.cylinderMaterialId === materialId ||
    slots.sphereMaterialId === materialId ||
    slots.fabricClothMaterialId === materialId ||
    slots.bookPagesMaterialId === materialId ||
    slots.bookCoverMaterialId === materialId ||
    slots.metalMaterialId === materialId ||
    slots.glassMaterialId === materialId ||
    slots.corkMaterialId === materialId ||
    slots.capsuleFoilMaterialId === materialId ||
    slots.capsuleDiscMaterialId === materialId
  );
}
