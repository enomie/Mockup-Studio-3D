import { defaultMaterialsForKind } from '@/data/material-presets';
import {
  clampExtrusionParams,
  cloneExtrusionParams,
  defaultExtrusionParams,
  type ExtrusionParams,
} from './asset-extrusion';
import {
  clampBeverageCanParams,
  cloneBeverageCanParams,
  defaultBeverageCanParams,
  type BeverageCanParams,
} from './asset-beverage-can';
import {
  clampBlockParams,
  cloneBlockParams,
  defaultBlockParams,
  type BlockParams,
} from './asset-block';
import {
  clampCylinderParams,
  cloneCylinderParams,
  defaultCylinderParams,
  type CylinderParams,
} from './asset-cylinder';
import {
  clampSphereParams,
  cloneSphereParams,
  defaultSphereParams,
  type SphereParams,
} from './asset-sphere';
import {
  clampWheelCarParams,
  cloneWheelCarParams,
  defaultWheelCarParams,
  type WheelCarParams,
} from './asset-wheel-car';
import {
  DEFAULT_PHYSICS_DENSITY_KG_PER_M3,
  resolvePhysicsBodyMode,
  resolvePhysicsDensityKgPerM3,
} from './physics-rigid-body';
import {
  clampFabricClothParams,
  cloneFabricClothParams,
  defaultFabricClothParams,
  fabricClothFootprintFromSizes,
  migrateFabricClothParams,
  type FabricClothParams,
} from './asset-fabric-cloth';
import { computeFaceSize } from './asset-sizing';
import {
  clampBookParams,
  cloneBookParams,
  defaultBookParams,
  resolveBookParams,
  type BookParams,
} from './asset-book';
import {
  cloneHandheldParams,
  defaultHandheldParams,
  isHandheldAssetKind,
  type HandheldDeviceParams,
} from './asset-handheld';
import type { AssetKind } from './asset-kind';
import {
  cloneMonitorParams,
  defaultMonitorParams,
  isMonitorAssetKind,
  type MonitorDeviceParams,
} from './asset-monitor';
import {
  clonePrintParams,
  defaultPrintParams,
  type PrintDeviceParams,
} from './asset-print';
import {
  clonePatchParams,
  defaultPatchParamsForKind,
  type PatchAssetKind,
  type PatchParams,
} from './asset-triangle-patch';
import {
  clampTinCanParams,
  cloneTinCanParams,
  defaultTinCanParams,
  type TinCanParams,
} from './asset-tin-can';
import {
  clampWallParams,
  clampWallpaperPattern,
  cloneWallParams,
  cloneWallpaperPattern,
  defaultWallParams,
  defaultWallpaperPattern,
  migrateWallpaperPattern,
  type WallParams,
  type WallpaperPattern,
} from './asset-wall';
import {
  clampWineBottleParams,
  cloneWineBottleParams,
  defaultWineBottleParams,
  type WineBottleParams,
} from './asset-wine-bottle';
import {
  clampPenParams,
  clonePenParams,
  defaultPenParams,
  type PenParams,
} from './asset-pen';
import type { AssetEntity } from './entity-types';
import type { AssetGeometryVisibility } from './geometry-visibility';
import type { AssetMaterialSlots } from './material-types';
import {
  geometryVisibilityFromPartDescriptors,
  type AssetGeometryPartDescriptor,
} from './geometry-parts';
import {
  GEOMETRY_PARTS_BEVERAGE_CAN,
  GEOMETRY_PARTS_HANDHELD,
  GEOMETRY_PARTS_MONITOR,
  GEOMETRY_PARTS_NONE,
  GEOMETRY_PARTS_PICTURE,
  GEOMETRY_PARTS_TIN_CAN,
  GEOMETRY_PARTS_PEN,
  GEOMETRY_PARTS_WINE_BOTTLE,
  GEOMETRY_PARTS_EXTRUSION,
} from './geometry-parts-catalog';

export type AssetKindFamily =
  | 'print'
  | 'picture'
  | 'device'
  | 'packaging'
  | 'architecture'
  | 'block'
  | 'fabric'
  | 'book';

export type AssetRebuildStrategy = 'sync-populateAssetGroup' | 'async-packaging-group';

export type AssetScreenImageRole = 'front' | 'label' | 'wallpaper';

export type AssetKindDefaultEntitySlice = Partial<
  Pick<
    AssetEntity,
    | 'params'
    | 'printParams'
    | 'wallParams'
    | 'wallpaperPattern'
    | 'blockParams'
    | 'cylinderParams'
    | 'sphereParams'
    | 'wheelCarParams'
    | 'extrusionParams'
    | 'beverageCanParams'
    | 'tinCanParams'
    | 'wineBottleParams'
    | 'penParams'
    | 'fabricClothParams'
    | 'bookParams'
    | 'bookBackCoverImageId'
    | 'bookSpineImageId'
    | 'patchParams'
    | 'physicsBodyMode'
    | 'physicsDensityKgPerM3'
  >
>;

export interface AssetKindDefinition {
  kind: AssetKind;
  family: AssetKindFamily;
  rebuildStrategy: AssetRebuildStrategy;
  screenImageRole: AssetScreenImageRole;
  geometryParts: readonly AssetGeometryPartDescriptor[];
  getGeometryVisibilityDefaults: () => AssetGeometryVisibility;
  getDefaultMaterials: () => AssetMaterialSlots;
  getDefaultEntitySlice: () => AssetKindDefaultEntitySlice;
  mergeParamPatch: (entity: AssetEntity, partial: unknown) => AssetKindDefaultEntitySlice;
  mergeWallpaperPatternPatch?: (
    entity: AssetEntity,
    partial: Partial<WallpaperPattern>,
  ) => AssetKindDefaultEntitySlice;
  cloneParamsFromEntity: (entity: AssetEntity) => AssetKindDefaultEntitySlice;
}

type DefinitionMeta = Pick<
  AssetKindDefinition,
  'kind' | 'family' | 'rebuildStrategy' | 'screenImageRole' | 'geometryParts'
>;

function bookKindHooks(kind: 'book-softcover' | 'book-hardcover') {
  return {
    getDefaultEntitySlice: () => ({
      bookParams: defaultBookParams(kind),
      bookBackCoverImageId: null,
      bookSpineImageId: null,
    }),
    mergeParamPatch: (entity: AssetEntity, partial: unknown) => {
      const current = resolveBookParams(entity.assetKind, entity.bookParams);
      return {
        bookParams: clampBookParams(
          partial as Partial<BookParams>,
          current,
          entity.assetKind,
        ),
      };
    },
    cloneParamsFromEntity: (entity: AssetEntity) => {
      const slice: AssetKindDefaultEntitySlice = {};
      if (entity.bookParams) {
        slice.bookParams = cloneBookParams(entity.bookParams);
      }
      if (entity.bookBackCoverImageId !== undefined) {
        slice.bookBackCoverImageId = entity.bookBackCoverImageId;
      }
      if (entity.bookSpineImageId !== undefined) {
        slice.bookSpineImageId = entity.bookSpineImageId;
      }
      return slice;
    },
  };
}

function withSharedHooks(
  meta: DefinitionMeta,
  hooks: Pick<
    AssetKindDefinition,
    | 'getDefaultEntitySlice'
    | 'mergeParamPatch'
    | 'mergeWallpaperPatternPatch'
    | 'cloneParamsFromEntity'
  >,
): AssetKindDefinition {
  const { kind, geometryParts } = meta;
  return {
    ...meta,
    getGeometryVisibilityDefaults: () =>
      geometryVisibilityFromPartDescriptors(geometryParts),
    getDefaultMaterials: () => defaultMaterialsForKind(kind),
    ...hooks,
  };
}

function fabricClothFootprintForEntity(entity: AssetEntity): {
  widthM: number;
  heightM: number;
} {
  if (entity.bakedClothFootprint) {
    return entity.bakedClothFootprint;
  }
  const face = computeFaceSize(
    entity.assetKind,
    undefined,
    undefined,
    entity.sizeScale,
    entity.wallParams ?? defaultWallParams(),
    entity.blockParams ?? defaultBlockParams(),
    entity,
  );
  return fabricClothFootprintFromSizes(face.width, face.height);
}

function mergeFabricClothParamsPatch(
  entity: AssetEntity,
  partial: Partial<FabricClothParams>,
): { fabricClothParams: FabricClothParams } {
  const footprint = fabricClothFootprintForEntity(entity);
  const current = migrateFabricClothParams(entity.fabricClothParams, footprint);
  return {
    fabricClothParams: clampFabricClothParams(partial, current, footprint),
  };
}

// --- Per-kind definitions (catalog order) ---

const ASSET_KIND_DEFINITIONS = {
  print: withSharedHooks(
    {
      kind: 'print',
      family: 'print',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_NONE,
    },
    {
      getDefaultEntitySlice: () => ({ printParams: defaultPrintParams() }),
      mergeParamPatch: (entity, partial) => {
        const current = entity.printParams ?? defaultPrintParams();
        return {
          printParams: {
            ...current,
            ...(partial as Partial<PrintDeviceParams>),
          },
        };
      },
      cloneParamsFromEntity: (entity) =>
        entity.printParams
          ? { printParams: clonePrintParams(entity.printParams) }
          : {},
    },
  ),
  picture: withSharedHooks(
    {
      kind: 'picture',
      family: 'picture',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_PICTURE,
    },
    {
      getDefaultEntitySlice: () => ({}),
      mergeParamPatch: () => ({}),
      cloneParamsFromEntity: () => ({}),
    },
  ),
  smartphone: withSharedHooks(
    {
      kind: 'smartphone',
      family: 'device',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_HANDHELD,
    },
    handheldDeviceHooks(),
  ),
  tablet: withSharedHooks(
    {
      kind: 'tablet',
      family: 'device',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_HANDHELD,
    },
    handheldDeviceHooks(),
  ),
  monitor: withSharedHooks(
    {
      kind: 'monitor',
      family: 'device',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_MONITOR,
    },
    {
      getDefaultEntitySlice: () => ({}),
      mergeParamPatch: (entity, partial) => {
        const current =
          (entity.params as MonitorDeviceParams | undefined) ?? defaultMonitorParams();
        return {
          params: {
            ...current,
            ...(partial as Partial<MonitorDeviceParams>),
          },
        };
      },
      cloneParamsFromEntity: (entity) =>
        entity.params && isMonitorAssetKind(entity.assetKind)
          ? { params: cloneMonitorParams(entity.params as MonitorDeviceParams) }
          : {},
    },
  ),
  wall: wallKindHooks('wall'),
  'wall-door': wallKindHooks('wall-door'),
  block: withSharedHooks(
    {
      kind: 'block',
      family: 'block',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_NONE,
    },
    {
      getDefaultEntitySlice: () => ({
        blockParams: defaultBlockParams(),
        physicsBodyMode: 'dynamic' as const,
        physicsDensityKgPerM3: DEFAULT_PHYSICS_DENSITY_KG_PER_M3,
      }),
      mergeParamPatch: (entity, partial) => {
        const current = entity.blockParams ?? defaultBlockParams();
        return {
          blockParams: clampBlockParams(partial as Partial<BlockParams>, current),
        };
      },
      cloneParamsFromEntity: (entity) => ({
        blockParams: cloneBlockParams(entity.blockParams ?? defaultBlockParams()),
        physicsBodyMode: resolvePhysicsBodyMode(entity),
        physicsDensityKgPerM3: resolvePhysicsDensityKgPerM3(entity),
      }),
    },
  ),
  cylinder: withSharedHooks(
    {
      kind: 'cylinder',
      family: 'block',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_NONE,
    },
    {
      getDefaultEntitySlice: () => ({
        cylinderParams: defaultCylinderParams(),
        physicsBodyMode: 'dynamic' as const,
        physicsDensityKgPerM3: DEFAULT_PHYSICS_DENSITY_KG_PER_M3,
      }),
      mergeParamPatch: (entity, partial) => {
        const current = entity.cylinderParams ?? defaultCylinderParams();
        return {
          cylinderParams: clampCylinderParams(partial as Partial<CylinderParams>, current),
        };
      },
      cloneParamsFromEntity: (entity) => ({
        cylinderParams: cloneCylinderParams(entity.cylinderParams ?? defaultCylinderParams()),
        physicsBodyMode: resolvePhysicsBodyMode(entity),
        physicsDensityKgPerM3: resolvePhysicsDensityKgPerM3(entity),
      }),
    },
  ),
  sphere: withSharedHooks(
    {
      kind: 'sphere',
      family: 'block',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_NONE,
    },
    {
      getDefaultEntitySlice: () => ({
        sphereParams: defaultSphereParams(),
        physicsBodyMode: 'dynamic' as const,
        physicsDensityKgPerM3: DEFAULT_PHYSICS_DENSITY_KG_PER_M3,
      }),
      mergeParamPatch: (entity, partial) => {
        const current = entity.sphereParams ?? defaultSphereParams();
        return {
          sphereParams: clampSphereParams(partial as Partial<SphereParams>, current),
        };
      },
      cloneParamsFromEntity: (entity) => ({
        sphereParams: cloneSphereParams(entity.sphereParams ?? defaultSphereParams()),
        physicsBodyMode: resolvePhysicsBodyMode(entity),
        physicsDensityKgPerM3: resolvePhysicsDensityKgPerM3(entity),
      }),
    },
  ),
  'wheel-car': withSharedHooks(
    {
      kind: 'wheel-car',
      family: 'block',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_NONE,
    },
    {
      getDefaultEntitySlice: () => ({
        wheelCarParams: defaultWheelCarParams(),
        physicsBodyMode: 'dynamic' as const,
        physicsDensityKgPerM3: DEFAULT_PHYSICS_DENSITY_KG_PER_M3,
      }),
      mergeParamPatch: (entity, partial) => {
        const current = entity.wheelCarParams ?? defaultWheelCarParams();
        return {
          wheelCarParams: clampWheelCarParams(partial as Partial<WheelCarParams>, current),
        };
      },
      cloneParamsFromEntity: (entity) => ({
        wheelCarParams: cloneWheelCarParams(entity.wheelCarParams ?? defaultWheelCarParams()),
        physicsBodyMode: resolvePhysicsBodyMode(entity),
        physicsDensityKgPerM3: resolvePhysicsDensityKgPerM3(entity),
      }),
    },
  ),
  extrusion: withSharedHooks(
    {
      kind: 'extrusion',
      family: 'block',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_EXTRUSION,
    },
    {
      getDefaultEntitySlice: () => ({ extrusionParams: defaultExtrusionParams() }),
      mergeParamPatch: (entity, partial) => {
        const current = entity.extrusionParams ?? defaultExtrusionParams();
        return {
          extrusionParams: clampExtrusionParams(partial as Partial<ExtrusionParams>, current),
        };
      },
      cloneParamsFromEntity: (entity) => ({
        extrusionParams: cloneExtrusionParams(entity.extrusionParams ?? defaultExtrusionParams()),
      }),
    },
  ),
  'fabric-cloth': withSharedHooks(
    {
      kind: 'fabric-cloth',
      family: 'fabric',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_NONE,
    },
    {
      getDefaultEntitySlice: () => ({
        fabricClothParams: defaultFabricClothParams(),
      }),
      mergeParamPatch: (entity, partial) =>
        mergeFabricClothParamsPatch(entity, partial as Partial<FabricClothParams>),
      cloneParamsFromEntity: (entity) =>
        entity.fabricClothParams
          ? { fabricClothParams: cloneFabricClothParams(entity.fabricClothParams) }
          : {},
    },
  ),
  'fabric-cloth-baked': withSharedHooks(
    {
      kind: 'fabric-cloth-baked',
      family: 'fabric',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_NONE,
    },
    {
      getDefaultEntitySlice: () => ({
        fabricClothParams: defaultFabricClothParams(),
      }),
      mergeParamPatch: (entity, partial) =>
        mergeFabricClothParamsPatch(entity, partial as Partial<FabricClothParams>),
      cloneParamsFromEntity: (entity) => ({
        fabricClothParams: cloneFabricClothParams(
          migrateFabricClothParams(
            entity.fabricClothParams,
            fabricClothFootprintForEntity(entity),
          ),
        ),
        userBakedAssetId: entity.userBakedAssetId,
        bakedClothFootprint: entity.bakedClothFootprint
          ? { ...entity.bakedClothFootprint }
          : undefined,
      }),
    },
  ),
  'book-softcover': withSharedHooks(
    {
      kind: 'book-softcover',
      family: 'book',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_NONE,
    },
    bookKindHooks('book-softcover'),
  ),
  'book-hardcover': withSharedHooks(
    {
      kind: 'book-hardcover',
      family: 'book',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_NONE,
    },
    bookKindHooks('book-hardcover'),
  ),
  'beverage-can': withSharedHooks(
    {
      kind: 'beverage-can',
      family: 'packaging',
      rebuildStrategy: 'async-packaging-group',
      screenImageRole: 'label',
      geometryParts: GEOMETRY_PARTS_BEVERAGE_CAN,
    },
    {
      getDefaultEntitySlice: () => ({
        beverageCanParams: defaultBeverageCanParams('standard'),
      }),
      mergeParamPatch: (entity, partial) => {
        const current =
          entity.beverageCanParams ?? defaultBeverageCanParams('standard');
        return {
          beverageCanParams: clampBeverageCanParams(
            partial as Partial<BeverageCanParams>,
            current,
          ),
        };
      },
      cloneParamsFromEntity: (entity) =>
        entity.beverageCanParams
          ? { beverageCanParams: cloneBeverageCanParams(entity.beverageCanParams) }
          : {},
    },
  ),
  'tin-can': withSharedHooks(
    {
      kind: 'tin-can',
      family: 'packaging',
      rebuildStrategy: 'async-packaging-group',
      screenImageRole: 'label',
      geometryParts: GEOMETRY_PARTS_TIN_CAN,
    },
    {
      getDefaultEntitySlice: () => ({ tinCanParams: defaultTinCanParams() }),
      mergeParamPatch: (entity, partial) => {
        const current = entity.tinCanParams ?? defaultTinCanParams();
        return {
          tinCanParams: clampTinCanParams(partial as Partial<TinCanParams>, current),
        };
      },
      cloneParamsFromEntity: (entity) =>
        entity.tinCanParams
          ? { tinCanParams: cloneTinCanParams(entity.tinCanParams) }
          : {},
    },
  ),
  'wine-bottle': withSharedHooks(
    {
      kind: 'wine-bottle',
      family: 'packaging',
      rebuildStrategy: 'async-packaging-group',
      screenImageRole: 'label',
      geometryParts: GEOMETRY_PARTS_WINE_BOTTLE,
    },
    {
      getDefaultEntitySlice: () => ({
        wineBottleParams: defaultWineBottleParams('bordeaux'),
      }),
      mergeParamPatch: (entity, partial) => {
        const current =
          entity.wineBottleParams ?? defaultWineBottleParams('bordeaux');
        return {
          wineBottleParams: clampWineBottleParams(
            partial as Partial<WineBottleParams>,
            current,
          ),
        };
      },
      cloneParamsFromEntity: (entity) =>
        entity.wineBottleParams
          ? { wineBottleParams: cloneWineBottleParams(entity.wineBottleParams) }
          : {},
    },
  ),
  pen: withSharedHooks(
    {
      kind: 'pen',
      family: 'packaging',
      rebuildStrategy: 'async-packaging-group',
      screenImageRole: 'label',
      geometryParts: GEOMETRY_PARTS_PEN,
    },
    {
      getDefaultEntitySlice: () => ({
        penParams: defaultPenParams('marker'),
      }),
      mergeParamPatch: (entity, partial) => {
        const current = entity.penParams ?? defaultPenParams('marker');
        return {
          penParams: clampPenParams(partial as Partial<PenParams>, current),
        };
      },
      cloneParamsFromEntity: (entity) =>
        entity.penParams ? { penParams: clonePenParams(entity.penParams) } : {},
    },
  ),
  'triangle-patch': patchKindDefinition('triangle-patch'),
  'quad-patch': patchKindDefinition('quad-patch'),
} satisfies Record<AssetKind, AssetKindDefinition>;

function patchKindDefinition(kind: PatchAssetKind): AssetKindDefinition {
  return withSharedHooks(
    {
      kind,
      family: 'block',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'front',
      geometryParts: GEOMETRY_PARTS_NONE,
    },
    {
      getDefaultEntitySlice: () => ({
        patchParams: defaultPatchParamsForKind(kind),
      }),
      mergeParamPatch: (entity, partial) => {
        const current = entity.patchParams ?? defaultPatchParamsForKind(kind);
        return {
          patchParams: {
            ...current,
            ...(partial as Partial<PatchParams>),
          },
        };
      },
      cloneParamsFromEntity: (entity) =>
        entity.patchParams
          ? { patchParams: clonePatchParams(entity.patchParams) }
          : {},
    },
  );
}

function handheldDeviceHooks(): Pick<
  AssetKindDefinition,
  'getDefaultEntitySlice' | 'mergeParamPatch' | 'cloneParamsFromEntity'
> {
  return {
    getDefaultEntitySlice: () => ({}),
    mergeParamPatch: (entity, partial) => {
      const current =
        (entity.params) ??
        defaultHandheldParams(entity.assetKind);
      return {
        params: {
          ...current,
          ...(partial as Partial<HandheldDeviceParams>),
        },
      };
    },
    cloneParamsFromEntity: (entity) =>
      entity.params && isHandheldAssetKind(entity.assetKind)
        ? { params: cloneHandheldParams(entity.params) }
        : {},
  };
}

function wallKindHooks(
  kind: 'wall' | 'wall-door',
): AssetKindDefinition {
  return withSharedHooks(
    {
      kind,
      family: 'architecture',
      rebuildStrategy: 'sync-populateAssetGroup',
      screenImageRole: 'wallpaper',
      geometryParts: GEOMETRY_PARTS_NONE,
    },
    {
      getDefaultEntitySlice: () => ({
        wallParams: defaultWallParams(),
        wallpaperPattern: defaultWallpaperPattern(),
      }),
      mergeParamPatch: (entity, partial) => {
        const current = entity.wallParams ?? defaultWallParams();
        return {
          wallParams: clampWallParams(partial as Partial<WallParams>, current),
        };
      },
      mergeWallpaperPatternPatch: (entity, partial) => {
        const current = migrateWallpaperPattern(
          entity.wallpaperPattern ?? defaultWallpaperPattern(),
        );
        return {
          wallpaperPattern: clampWallpaperPattern(partial, current),
        };
      },
      cloneParamsFromEntity: (entity) => {
        const slice: AssetKindDefaultEntitySlice = {};
        if (entity.wallParams) {
          slice.wallParams = cloneWallParams(entity.wallParams);
        }
        if (entity.wallpaperPattern) {
          slice.wallpaperPattern = cloneWallpaperPattern(entity.wallpaperPattern);
        }
        return slice;
      },
    },
  );
}

// --- Lookup ---

export function getAssetKindDefinition(kind: AssetKind): AssetKindDefinition {
  return ASSET_KIND_DEFINITIONS[kind];
}

export function getGeometryPartsForKind(
  kind: AssetKind,
): readonly AssetGeometryPartDescriptor[] {
  return getAssetKindDefinition(kind).geometryParts;
}

export function getAssetKindFamily(kind: AssetKind): AssetKindFamily {
  return getAssetKindDefinition(kind).family;
}

export function getAllAssetKindDefinitions(): readonly AssetKindDefinition[] {
  return Object.values(ASSET_KIND_DEFINITIONS);
}

export function getDefaultEntitySliceForKind(kind: AssetKind): AssetKindDefaultEntitySlice {
  return getAssetKindDefinition(kind).getDefaultEntitySlice();
}

export function mergeKindParamPatch(
  kind: AssetKind,
  entity: AssetEntity,
  partial: unknown,
): AssetKindDefaultEntitySlice {
  return getAssetKindDefinition(kind).mergeParamPatch(entity, partial);
}

export function mergeKindWallpaperPatternPatch(
  kind: AssetKind,
  entity: AssetEntity,
  partial: Partial<WallpaperPattern>,
): AssetKindDefaultEntitySlice {
  const definition = getAssetKindDefinition(kind);
  if (!definition.mergeWallpaperPatternPatch) {
    return {};
  }
  return definition.mergeWallpaperPatternPatch(entity, partial);
}

export function cloneKindParamsFromEntity(
  kind: AssetKind,
  entity: AssetEntity,
): AssetKindDefaultEntitySlice {
  return getAssetKindDefinition(kind).cloneParamsFromEntity(entity);
}

export function usesAsyncPackagingRebuild(kind: AssetKind): boolean {
  return getAssetKindDefinition(kind).rebuildStrategy === 'async-packaging-group';
}
