import { defaultMaterialsForKind } from '@/data/material-presets';
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
  GEOMETRY_PARTS_WINE_BOTTLE,
} from './geometry-parts-catalog';

export type AssetKindFamily =
  | 'print'
  | 'picture'
  | 'device'
  | 'packaging'
  | 'architecture'
  | 'block';

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
    | 'beverageCanParams'
    | 'tinCanParams'
    | 'wineBottleParams'
  >
>;

export type AssetKindDefinition = {
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
};

type DefinitionMeta = Pick<
  AssetKindDefinition,
  'kind' | 'family' | 'rebuildStrategy' | 'screenImageRole' | 'geometryParts'
>;

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
      getDefaultEntitySlice: () => ({ blockParams: defaultBlockParams() }),
      mergeParamPatch: (entity, partial) => {
        const current = entity.blockParams ?? defaultBlockParams();
        return {
          blockParams: clampBlockParams(partial as Partial<BlockParams>, current),
        };
      },
      cloneParamsFromEntity: (entity) =>
        entity.blockParams
          ? { blockParams: cloneBlockParams(entity.blockParams) }
          : {},
    },
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
} satisfies Record<AssetKind, AssetKindDefinition>;

function handheldDeviceHooks(): Pick<
  AssetKindDefinition,
  'getDefaultEntitySlice' | 'mergeParamPatch' | 'cloneParamsFromEntity'
> {
  return {
    getDefaultEntitySlice: () => ({}),
    mergeParamPatch: (entity, partial) => {
      const current =
        (entity.params as HandheldDeviceParams | undefined) ??
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
        ? { params: cloneHandheldParams(entity.params as HandheldDeviceParams) }
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
