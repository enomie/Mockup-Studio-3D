import type { Object3D } from 'three/webgpu';
import {
  cloneAssetFaces,
  cloneFaceContent,
  type AssetFaceContent,
  type AssetFaceId,
  type AssetFaces,
} from '@/scene/asset-faces';
import { cloneBeverageCanParams } from '@/scene/asset-beverage-can';
import { cloneBlockParams } from '@/scene/asset-block';
import { isRigidPrimitiveAssetKind } from '@/scene/rigid-primitive-asset';
import { buildRigidPrimitiveUniformScalePartial } from '@/scene/rigid-primitive-uniform-scale';
import {
  clampPhysicsDensityKgPerM3,
  normalizePhysicsBodyMode,
  type PhysicsBodyMode,
} from '@/scene/physics-rigid-body';
import { cloneFabricClothParams } from '@/scene/asset-fabric-cloth';
import { isBookAssetKind } from '@/scene/asset-book';
import type { BookMaterialTintPart } from '@/scene/book-material-tints';
import { cloneHandheldParams } from '@/scene/asset-handheld';
import {
  getAssetKindDefinition,
  mergeKindParamPatch,
  mergeKindWallpaperPatternPatch,
} from '@/scene/asset-kind-registry';
import {
  cloneMonitorParams,
  isMonitorAssetKind,
} from '@/scene/asset-monitor';
import { clonePrintParams } from '@/scene/asset-print';
import { cloneTinCanParams } from '@/scene/asset-tin-can';
import {
  cloneWallParams,
  cloneWallpaperPattern,
  isWallAssetKind,
  migrateWallpaperPattern,
} from '@/scene/asset-wall';
import { cloneWineBottleParams } from '@/scene/asset-wine-bottle';
import { clonePenParams } from '@/scene/asset-pen';
import {
  cloneTransform,
  DEFAULT_SIZE_SCALE,
  defaultTransform,
  type AssetEntity,
  type AssetGeometryPart,
  type AssetKind,
  type EntityTransform,
  type HandheldDeviceParams,
  type MonitorDeviceParams,
  type MaterialEntitySlot,
  type PrintDeviceParams,
  type WallpaperPattern,
  type AssetImageSurfaceId,
} from '@/scene/entity-types';
import {
  cloneGeometryVisibility,
  defaultGeometryVisibility,
  migrateGeometryVisibility,
  type AssetGeometryVisibility,
} from '@/scene/geometry-visibility';
import {
  migrateImageSurfaces,
  resolveImageSurfaceSettings,
  type ImageSurfaceSettings,
} from '@/scene/image-surface';
import {
  defaultMaterialsForKind,
  migrateMaterialSlots,
} from '@/data/material-presets';
import {
  cloneAssetMaterials,
  type AssetMaterialSlots,
} from '@/scene/material-types';
import type { Rgb } from '@/colors/rgb';
import { assetKindLabel } from '@/data/asset-catalog';
import {
  kindAcceptsParamFamily,
  type KindParamFamily,
  type KindParamsByFamily,
} from '@/scene/kind-param-families';

export interface EntityRuntime {
  entity: AssetEntity;
  object: Object3D;
}

type EntityChangeListener = () => void;
type SelectionChangeListener = (entityId: string | null) => void;

const SPAWN_X_STEP = 0.25;

export class EntityRegistry {
  // --- Subscriptions ---

  private readonly entities = new Map<string, EntityRuntime>();
  private readonly kindCounters = new Map<AssetKind, number>();
  private selectedEntityId: string | null = null;
  private spawnIndex = 0;

  private readonly entityListeners = new Set<EntityChangeListener>();
  private readonly selectionListeners = new Set<SelectionChangeListener>();

  subscribeEntities(listener: EntityChangeListener): () => void {
    this.entityListeners.add(listener);
    return () => this.entityListeners.delete(listener);
  }

  subscribeSelection(listener: SelectionChangeListener): () => void {
    this.selectionListeners.add(listener);
    return () => this.selectionListeners.delete(listener);
  }

  /** World roots for visible placed assets (shadow coverage, bounds). */
  getVisibleEntityRoots(): Object3D[] {
    const roots: Object3D[] = [];
    for (const { entity, object } of this.entities.values()) {
      if (entity.visible) {
        roots.push(object);
      }
    }
    return roots;
  }

  getEntities(): readonly AssetEntity[] {
    return [...this.entities.values()].map((entry) => ({
      ...entry.entity,
      transform: cloneTransform(entry.entity.transform),
      faces: entry.entity.faces ? cloneAssetFaces(entry.entity.faces) : undefined,
      depth: entry.entity.depth,
      sizeScale: entry.entity.sizeScale,
      materials: entry.entity.materials
        ? migrateMaterialSlots(cloneAssetMaterials(entry.entity.materials))
        : undefined,
      geometryVisibility: migrateGeometryVisibility(
        entry.entity.assetKind,
        entry.entity.geometryVisibility
          ? cloneGeometryVisibility(entry.entity.geometryVisibility)
          : undefined,
        entry.entity.materials,
      ),
      params: entry.entity.params
        ? isMonitorAssetKind(entry.entity.assetKind)
          ? cloneMonitorParams(entry.entity.params as MonitorDeviceParams)
          : cloneHandheldParams(entry.entity.params)
        : undefined,
      printParams: entry.entity.printParams
        ? clonePrintParams(entry.entity.printParams)
        : undefined,
      wallParams: entry.entity.wallParams
        ? cloneWallParams(entry.entity.wallParams)
        : undefined,
      wallpaperPattern: entry.entity.wallpaperPattern
        ? cloneWallpaperPattern(
            migrateWallpaperPattern(entry.entity.wallpaperPattern),
          )
        : undefined,
      blockParams: entry.entity.blockParams
        ? cloneBlockParams(entry.entity.blockParams)
        : undefined,
      physicsBodyMode: entry.entity.physicsBodyMode,
      physicsDensityKgPerM3: entry.entity.physicsDensityKgPerM3,
      beverageCanParams: entry.entity.beverageCanParams
        ? cloneBeverageCanParams(entry.entity.beverageCanParams)
        : undefined,
      tinCanParams: entry.entity.tinCanParams
        ? cloneTinCanParams(entry.entity.tinCanParams)
        : undefined,
      wineBottleParams: entry.entity.wineBottleParams
        ? cloneWineBottleParams(entry.entity.wineBottleParams)
        : undefined,
      penParams: entry.entity.penParams
        ? clonePenParams(entry.entity.penParams)
        : undefined,
      fabricClothParams: entry.entity.fabricClothParams
        ? cloneFabricClothParams(entry.entity.fabricClothParams)
        : undefined,
      visible: entry.entity.visible,
    }));
  }

  getSelectedEntityId(): string | null {
    return this.selectedEntityId;
  }

  // --- Queries ---

  getRuntime(entityId: string): EntityRuntime | undefined {
    return this.entities.get(entityId);
  }

  getSelectedRuntime(): EntityRuntime | undefined {
    if (!this.selectedEntityId) {return undefined;}
    return this.entities.get(this.selectedEntityId);
  }

  createSpawnTransform(positionY: number): EntityTransform {
    const transform = defaultTransform();
    const x = this.spawnIndex * SPAWN_X_STEP;
    this.spawnIndex += 1;
    transform.position = {
      x,
      y: positionY,
      z: 0,
    };
    return transform;
  }

  createTransformAt(x: number, z: number, positionY: number): EntityTransform {
    const transform = defaultTransform();
    transform.position = {
      x,
      y: positionY,
      z,
    };
    return transform;
  }

  // --- Spawn helpers ---

  reserveSpawnSlots(count: number): void {
    this.spawnIndex += count;
  }

  addEntity(
    id: string,
    assetKind: AssetKind,
    object: Object3D,
    transform: EntityTransform,
    screenImageId: string | null = null,
    faces?: AssetFaces,
    depth?: number,
    materials?: AssetMaterialSlots,
    params?: HandheldDeviceParams | MonitorDeviceParams,
    geometryVisibility?: AssetGeometryVisibility,
    printParams?: PrintDeviceParams,
  ): AssetEntity {
    const count = (this.kindCounters.get(assetKind) ?? 0) + 1;
    this.kindCounters.set(assetKind, count);

    const definition = getAssetKindDefinition(assetKind);
    const kindDefaults = definition.getDefaultEntitySlice();

    const baseEntity = {
      assetKind,
      screenImageId,
      faces: faces ? cloneAssetFaces(faces) : undefined,
      materials: migrateMaterialSlots(
        cloneAssetMaterials(materials ?? definition.getDefaultMaterials()),
      ),
    };

    const entity: AssetEntity = {
      id,
      type: 'asset',
      name: `${assetKindLabel(assetKind)} ${count}`,
      ...baseEntity,
      depth,
      sizeScale: DEFAULT_SIZE_SCALE,
      imageSurfaces: migrateImageSurfaces(baseEntity),
      geometryVisibility: migrateGeometryVisibility(
        assetKind,
        geometryVisibility ?? definition.getGeometryVisibilityDefaults(),
        materials,
      ),
      ...kindDefaults,
      ...(params
        ? {
            params: isMonitorAssetKind(assetKind)
              ? cloneMonitorParams(params as MonitorDeviceParams)
              : cloneHandheldParams(params),
          }
        : {}),
      ...(printParams ? { printParams: clonePrintParams(printParams) } : {}),
      visible: true,
      transform: cloneTransform(transform),
    };

    object.userData.entityId = id;
    this.applyTransformToObject(object, transform);

    this.entities.set(id, { entity, object });
    this.emitEntities();
    return entity;
  }

  removeEntity(entityId: string): void {
    if (!this.entities.has(entityId)) {return;}
    this.entities.delete(entityId);
    if (this.selectedEntityId === entityId) {
      this.setSelectedEntityId(null);
    }
    this.emitEntities();
  }

  // --- Selection & transform ---

  setSelectedEntityId(entityId: string | null): void {
    if (this.selectedEntityId === entityId) {return;}
    this.selectedEntityId = entityId;
    this.selectionListeners.forEach((listener) => { listener(entityId); });
    this.emitEntities();
  }

  updateTransform(entityId: string, partial: Partial<EntityTransform>): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}

    const next = cloneTransform(runtime.entity.transform);
    if (partial.position) {
      next.position = { ...partial.position };
    }
    if (partial.rotation) {
      next.rotation = { ...partial.rotation };
    }

    runtime.entity.transform = next;
    this.applyTransformToObject(runtime.object, next);
    this.emitEntities();
  }

  syncTransformFromObject(entityId: string): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}

    runtime.entity.transform = readTransformFromObject(runtime.object);
    this.emitEntities();
  }

  setScreenImageId(entityId: string, imageId: string | null): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    runtime.entity.screenImageId = imageId;
    this.emitEntities();
  }

  setAssetDepth(entityId: string, depth: number): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    runtime.entity.depth = depth;
    this.emitEntities();
  }

  setSizeScale(entityId: string, sizeScale: number): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    runtime.entity.sizeScale = sizeScale;
    this.emitEntities();
  }

  setEntityVisible(entityId: string, visible: boolean): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    runtime.entity.visible = visible;
    runtime.object.visible = visible;
    this.emitEntities();
  }

  setEntityMaterialSlot(
    entityId: string,
    slot: MaterialEntitySlot,
    materialId: string,
  ): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}

    const materials = cloneAssetMaterials(
      runtime.entity.materials ?? defaultMaterialsForKind(runtime.entity.assetKind),
    );
    materials[slot] = materialId;
    runtime.entity.materials = materials;
    this.emitEntities();
  }

  // --- Kind param patches ---

  setKindParams<F extends KindParamFamily>(
    family: F,
    entityId: string,
    partial: Partial<KindParamsByFamily[F]>,
  ): void {
    const runtime = this.entities.get(entityId);
    if (!runtime || !kindAcceptsParamFamily(runtime.entity.assetKind, family)) {return;}
    this.applyKindParamPatch(runtime, partial);
  }

  applyRigidPrimitiveUniformScale(entityId: string, factor: number): boolean {
    const runtime = this.entities.get(entityId);
    if (!runtime || !isRigidPrimitiveAssetKind(runtime.entity.assetKind)) {
      return false;
    }

    const partial = buildRigidPrimitiveUniformScalePartial(runtime.entity, factor);
    if (!partial) {
      return false;
    }

    this.applyKindParamPatch(runtime, partial);
    return true;
  }

  setPhysicsBodyMode(entityId: string, mode: PhysicsBodyMode): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    runtime.entity.physicsBodyMode = normalizePhysicsBodyMode(mode);
    this.emitEntities();
  }

  setPhysicsDensityKgPerM3(entityId: string, densityKgPerM3: number): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    runtime.entity.physicsDensityKgPerM3 = clampPhysicsDensityKgPerM3(densityKgPerM3);
    this.emitEntities();
  }

  patchEntityFields(entityId: string, partial: Partial<AssetEntity>): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    Object.assign(runtime.entity, partial);
    this.emitEntities();
  }

  setBookBackCoverImageId(entityId: string, imageId: string | null): void {
    const runtime = this.entities.get(entityId);
    if (!runtime || !isBookAssetKind(runtime.entity.assetKind)) {return;}
    runtime.entity.bookBackCoverImageId = imageId;
    this.emitEntities();
  }

  setBookSpineImageId(entityId: string, imageId: string | null): void {
    const runtime = this.entities.get(entityId);
    if (!runtime || !isBookAssetKind(runtime.entity.assetKind)) {return;}
    runtime.entity.bookSpineImageId = imageId;
    this.emitEntities();
  }

  setBookMaterialTint(
    entityId: string,
    part: BookMaterialTintPart,
    tint: Rgb,
  ): void {
    const runtime = this.entities.get(entityId);
    if (!runtime || !isBookAssetKind(runtime.entity.assetKind)) {return;}

    const materials = cloneAssetMaterials(
      runtime.entity.materials ?? defaultMaterialsForKind(runtime.entity.assetKind),
    );
    if (part === 'pages') {
      materials.bookPagesTint = { ...tint };
    } else {
      materials.bookCoverTint = { ...tint };
    }
    runtime.entity.materials = materials;
    this.emitEntities();
  }

  setWallpaperPattern(
    entityId: string,
    partial: Partial<WallpaperPattern>,
  ): void {
    const runtime = this.entities.get(entityId);
    if (!runtime || !isWallAssetKind(runtime.entity.assetKind)) {return;}

    Object.assign(
      runtime.entity,
      mergeKindWallpaperPatternPatch(runtime.entity.assetKind, runtime.entity, partial),
    );
    this.emitEntities();
  }

  private applyKindParamPatch(runtime: EntityRuntime, partial: unknown): void {
    Object.assign(
      runtime.entity,
      mergeKindParamPatch(runtime.entity.assetKind, runtime.entity, partial),
    );
    this.emitEntities();
  }

  setGeometryVisible(
    entityId: string,
    part: AssetGeometryPart,
    visible: boolean,
  ): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}

    const visibility = migrateGeometryVisibility(
      runtime.entity.assetKind,
      runtime.entity.geometryVisibility
        ? cloneGeometryVisibility(runtime.entity.geometryVisibility)
        : defaultGeometryVisibility(runtime.entity.assetKind),
      runtime.entity.materials,
    );
    visibility[part] = visible;
    runtime.entity.geometryVisibility = visibility;
    this.emitEntities();
  }

  setImageSurface(
    entityId: string,
    faceId: AssetImageSurfaceId,
    partial: Partial<ImageSurfaceSettings>,
  ): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}

    const current = resolveImageSurfaceSettings(
      runtime.entity.imageSurfaces,
      faceId,
      { assetKind: runtime.entity.assetKind },
    );
    runtime.entity.imageSurfaces = {
      ...runtime.entity.imageSurfaces,
      [faceId]: { ...current, ...partial },
    };
    this.emitEntities();
  }

  setFaceTint(entityId: string, faceId: AssetFaceId, tint: Rgb): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}

    const materials = cloneAssetMaterials(
      runtime.entity.materials ?? defaultMaterialsForKind(runtime.entity.assetKind),
    );
    materials.faceTints = {
      ...materials.faceTints,
      [faceId]: { ...tint },
    };
    runtime.entity.materials = materials;
    this.emitEntities();
  }

  setAssetFaceContent(
    entityId: string,
    faceId: AssetFaceId,
    content: AssetFaceContent,
  ): void {
    const runtime = this.entities.get(entityId);
    if (!runtime?.entity.faces) {return;}

    runtime.entity.faces = {
      ...runtime.entity.faces,
      [faceId]: cloneFaceContent(content),
    };

    if (faceId === 'front') {
      runtime.entity.screenImageId =
        content.mode === 'image' ? content.imageId : null;
    }

    this.emitEntities();
  }

  private applyTransformToObject(object: Object3D, transform: EntityTransform): void {
    object.position.set(
      transform.position.x,
      transform.position.y,
      transform.position.z,
    );
    object.rotation.set(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z,
    );
  }

  private emitEntities(): void {
    this.entityListeners.forEach((listener) => { listener(); });
  }
}

export { cloneTransform } from '@/scene/entity-types';

export function readTransformFromObject(object: Object3D): EntityTransform {
  return {
    position: {
      x: object.position.x,
      y: object.position.y,
      z: object.position.z,
    },
    rotation: {
      x: object.rotation.x,
      y: object.rotation.y,
      z: object.rotation.z,
    },
  };
}
