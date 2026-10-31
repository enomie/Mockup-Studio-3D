import type { Object3D } from 'three/webgpu';
import {
  cloneAssetFaces,
  cloneFaceContent,
  type AssetFaceContent,
  type AssetFaceId,
  type AssetFaces,
} from '@/scene/asset-faces';


import { isRigidPrimitiveAssetKind } from '@/scene/rigid-primitive-asset';
import { buildRigidPrimitiveUniformScalePartial } from '@/scene/rigid-primitive-uniform-scale';
import {
  clampPhysicsDensityKgPerM3,
  normalizePhysicsBodyMode,
  type PhysicsBodyMode,
} from '@/scene/physics-rigid-body';

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

import {
  isWallAssetKind,
} from '@/scene/asset-wall';


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
  private entitiesSnapshot: readonly AssetEntity[] | null = null;
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

  /** Cached, frozen snapshot; the same array is returned until an entity changes. */
  getEntities(): readonly AssetEntity[] {
    this.entitiesSnapshot ??= Object.freeze(
      [...this.entities.values()].map((entry) => entry.entity),
    );
    return this.entitiesSnapshot;
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

    const frozen = freezeInDev(entity);
    this.entities.set(id, { entity: frozen, object });
    this.markEntitiesChanged();
    return frozen;
  }

  removeEntity(entityId: string): void {
    if (!this.entities.has(entityId)) {return;}
    this.entities.delete(entityId);
    if (this.selectedEntityId === entityId) {
      this.setSelectedEntityId(null);
    }
    this.markEntitiesChanged();
  }

  // --- History restore ---

  /**
   * Swaps in a stored entity (undo/redo). Re-applies transform and visibility to the
   * existing object; the caller rebuilds the geometry.
   */
  restoreEntity(entity: AssetEntity): void {
    const runtime = this.entities.get(entity.id);
    if (!runtime) {return;}
    runtime.entity = entity;
    this.applyTransformToObject(runtime.object, entity.transform);
    runtime.object.visible = entity.visible;
    this.markEntitiesChanged();
  }

  /** Re-inserts a stored entity with a fresh (empty) object root (undo of a removal). */
  insertRestoredEntity(entity: AssetEntity, object: Object3D): void {
    object.userData.entityId = entity.id;
    this.applyTransformToObject(object, entity.transform);
    object.visible = entity.visible;
    this.entities.set(entity.id, { entity, object });
    this.markEntitiesChanged();
  }

  /** Reorders entities to match `ids`; unknown ids are ignored, missing ones keep their place at the end. */
  reorderEntities(ids: readonly string[]): void {
    const ordered = new Map<string, EntityRuntime>();
    for (const id of ids) {
      const runtime = this.entities.get(id);
      if (runtime) {ordered.set(id, runtime);}
    }
    for (const [id, runtime] of this.entities) {
      if (!ordered.has(id)) {ordered.set(id, runtime);}
    }
    const changed = [...ordered.keys()].some((id, i) => [...this.entities.keys()][i] !== id);
    if (!changed) {return;}
    this.entities.clear();
    for (const [id, runtime] of ordered) {this.entities.set(id, runtime);}
    this.markEntitiesChanged();
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

    this.applyTransformToObject(runtime.object, next);
    this.updateEntity(runtime, { transform: next });
  }

  syncTransformFromObject(entityId: string): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}

    this.updateEntity(runtime, { transform: readTransformFromObject(runtime.object) });
  }

  setScreenImageId(entityId: string, imageId: string | null): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    this.updateEntity(runtime, { screenImageId: imageId });
  }

  setAssetDepth(entityId: string, depth: number): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    this.updateEntity(runtime, { depth });
  }

  setSizeScale(entityId: string, sizeScale: number): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    this.updateEntity(runtime, { sizeScale });
  }

  setEntityVisible(entityId: string, visible: boolean): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    runtime.object.visible = visible;
    this.updateEntity(runtime, { visible });
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
    this.updateEntity(runtime, { materials });
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
    this.updateEntity(runtime, { physicsBodyMode: normalizePhysicsBodyMode(mode) });
  }

  setPhysicsDensityKgPerM3(entityId: string, densityKgPerM3: number): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    this.updateEntity(runtime, {
      physicsDensityKgPerM3: clampPhysicsDensityKgPerM3(densityKgPerM3),
    });
  }

  patchEntityFields(entityId: string, partial: Partial<AssetEntity>): void {
    const runtime = this.entities.get(entityId);
    if (!runtime) {return;}
    this.updateEntity(runtime, partial);
  }

  setBookBackCoverImageId(entityId: string, imageId: string | null): void {
    const runtime = this.entities.get(entityId);
    if (!runtime || !isBookAssetKind(runtime.entity.assetKind)) {return;}
    this.updateEntity(runtime, { bookBackCoverImageId: imageId });
  }

  setBookSpineImageId(entityId: string, imageId: string | null): void {
    const runtime = this.entities.get(entityId);
    if (!runtime || !isBookAssetKind(runtime.entity.assetKind)) {return;}
    this.updateEntity(runtime, { bookSpineImageId: imageId });
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
    this.updateEntity(runtime, { materials });
  }

  setWallpaperPattern(
    entityId: string,
    partial: Partial<WallpaperPattern>,
  ): void {
    const runtime = this.entities.get(entityId);
    if (!runtime || !isWallAssetKind(runtime.entity.assetKind)) {return;}

    this.updateEntity(
      runtime,
      mergeKindWallpaperPatternPatch(runtime.entity.assetKind, runtime.entity, partial),
    );
  }

  private applyKindParamPatch(runtime: EntityRuntime, partial: unknown): void {
    this.updateEntity(
      runtime,
      mergeKindParamPatch(runtime.entity.assetKind, runtime.entity, partial),
    );
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
    this.updateEntity(runtime, { geometryVisibility: visibility });
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
    this.updateEntity(runtime, {
      imageSurfaces: {
        ...runtime.entity.imageSurfaces,
        [faceId]: { ...current, ...partial },
      },
    });
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
    this.updateEntity(runtime, { materials });
  }

  setAssetFaceContent(
    entityId: string,
    faceId: AssetFaceId,
    content: AssetFaceContent,
  ): void {
    const runtime = this.entities.get(entityId);
    if (!runtime?.entity.faces) {return;}

    this.updateEntity(runtime, {
      faces: { ...runtime.entity.faces, [faceId]: cloneFaceContent(content) },
      ...(faceId === 'front'
        ? { screenImageId: content.mode === 'image' ? content.imageId : null }
        : {}),
    });
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

  /** Replaces the entity with an updated copy; entities are never mutated in place. */
  private updateEntity(runtime: EntityRuntime, patch: Partial<AssetEntity>): void {
    runtime.entity = freezeInDev({ ...runtime.entity, ...patch });
    this.markEntitiesChanged();
  }

  private markEntitiesChanged(): void {
    this.entitiesSnapshot = null;
    this.emitEntities();
  }

  private emitEntities(): void {
    this.entityListeners.forEach((listener) => { listener(); });
  }
}

export { cloneTransform } from '@/scene/entity-types';

/**
 * Deep-freezes entities in development builds and tests so accidental in-place
 * mutation (which would bypass change notification) throws instead of going unnoticed.
 */
function freezeInDev<T>(value: T): T {
  if (import.meta.env.DEV) {
    deepFreeze(value);
  }
  return value;
}

function deepFreeze(value: unknown): void {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {return;}
  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
}

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
