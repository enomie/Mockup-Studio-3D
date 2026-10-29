import { describe, expect, it } from 'vitest';
import { defaultMaterialsForKind } from '@/data/material-presets';
import {
  clampBlockParams,
  defaultBlockParams,
} from './asset-block';
import { defaultBeverageCanParams, clampBeverageCanParams } from './asset-beverage-can';
import type { AssetKind } from './asset-kind';
import {
  cloneKindParamsFromEntity,
  getAllAssetKindDefinitions,
  getAssetKindDefinition,
  getAssetKindFamily,
  getDefaultEntitySliceForKind,
  mergeKindParamPatch,
  usesAsyncPackagingRebuild,
  type AssetKindFamily,
  type AssetRebuildStrategy,
  type AssetScreenImageRole,
} from './asset-kind-registry';
import { defaultPrintParams } from './asset-print';
import {
  DEFAULT_SIZE_SCALE,
  defaultTransform,
  type AssetEntity,
} from './entity-types';
import { geometryVisibilityFromPartDescriptors } from './geometry-parts';
import { defaultGeometryVisibilityForKind } from './geometry-visibility-defaults';

const ALL_ASSET_KINDS: Record<AssetKind, true> = {
  print: true,
  picture: true,
  smartphone: true,
  tablet: true,
  monitor: true,
  wall: true,
  'wall-door': true,
  block: true,
  cylinder: true,
  sphere: true,
  'wheel-car': true,
  'beverage-can': true,
  'tin-can': true,
  'wine-bottle': true,
  pen: true,
  'fabric-cloth': true,
  'fabric-cloth-baked': true,
  'book-softcover': true,
  'book-hardcover': true,
  'triangle-patch': true,
};

const EXPECTED_METADATA: Record<
  AssetKind,
  {
    family: AssetKindFamily;
    rebuildStrategy: AssetRebuildStrategy;
    screenImageRole: AssetScreenImageRole;
  }
> = {
  print: {
    family: 'print',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  picture: {
    family: 'picture',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  smartphone: {
    family: 'device',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  tablet: {
    family: 'device',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  monitor: {
    family: 'device',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  wall: {
    family: 'architecture',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'wallpaper',
  },
  'wall-door': {
    family: 'architecture',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'wallpaper',
  },
  block: {
    family: 'block',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  cylinder: {
    family: 'block',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  sphere: {
    family: 'block',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  'wheel-car': {
    family: 'block',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  'beverage-can': {
    family: 'packaging',
    rebuildStrategy: 'async-packaging-group',
    screenImageRole: 'label',
  },
  'tin-can': {
    family: 'packaging',
    rebuildStrategy: 'async-packaging-group',
    screenImageRole: 'label',
  },
  'wine-bottle': {
    family: 'packaging',
    rebuildStrategy: 'async-packaging-group',
    screenImageRole: 'label',
  },
  pen: {
    family: 'packaging',
    rebuildStrategy: 'async-packaging-group',
    screenImageRole: 'label',
  },
  'fabric-cloth': {
    family: 'fabric',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  'fabric-cloth-baked': {
    family: 'fabric',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  'book-softcover': {
    family: 'book',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  'book-hardcover': {
    family: 'book',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
  'triangle-patch': {
    family: 'block',
    rebuildStrategy: 'sync-populateAssetGroup',
    screenImageRole: 'front',
  },
};

const EXPECTED_DEFAULT_SLICE_KEYS: Record<AssetKind, string[]> = {
  print: ['printParams'],
  picture: [],
  smartphone: [],
  tablet: [],
  monitor: [],
  wall: ['wallParams', 'wallpaperPattern'],
  'wall-door': ['wallParams', 'wallpaperPattern'],
  block: ['blockParams', 'physicsBodyMode', 'physicsDensityKgPerM3'],
  cylinder: ['cylinderParams', 'physicsBodyMode', 'physicsDensityKgPerM3'],
  sphere: ['sphereParams', 'physicsBodyMode', 'physicsDensityKgPerM3'],
  'wheel-car': ['wheelCarParams', 'physicsBodyMode', 'physicsDensityKgPerM3'],
  'beverage-can': ['beverageCanParams'],
  'tin-can': ['tinCanParams'],
  'wine-bottle': ['wineBottleParams'],
  pen: ['penParams'],
  'fabric-cloth': ['fabricClothParams'],
  'fabric-cloth-baked': ['fabricClothParams'],
  'book-softcover': ['bookParams', 'bookBackCoverImageId', 'bookSpineImageId'],
  'book-hardcover': ['bookParams', 'bookBackCoverImageId', 'bookSpineImageId'],
  'triangle-patch': ['trianglePatchParams'],
};

function minimalEntity(kind: AssetKind): AssetEntity {
  return {
    id: 'test',
    type: 'asset',
    name: 'test',
    assetKind: kind,
    screenImageId: null,
    sizeScale: DEFAULT_SIZE_SCALE,
    visible: true,
    transform: defaultTransform(),
  };
}

describe('asset-kind-registry', () => {
  it('covers every AssetKind exactly once', () => {
    const definitions = getAllAssetKindDefinitions();
    const expectedKinds = Object.keys(ALL_ASSET_KINDS) as AssetKind[];

    expect(definitions.length).toBe(expectedKinds.length);
    for (const kind of expectedKinds) {
      expect(getAssetKindDefinition(kind).kind).toBe(kind);
    }
  });

  it('matches metadata per kind', () => {
    for (const kind of Object.keys(ALL_ASSET_KINDS) as AssetKind[]) {
      const definition = getAssetKindDefinition(kind);
      const expected = EXPECTED_METADATA[kind];
      expect(definition.family).toBe(expected.family);
      expect(getAssetKindFamily(kind)).toBe(expected.family);
      expect(definition.rebuildStrategy).toBe(expected.rebuildStrategy);
      expect(definition.screenImageRole).toBe(expected.screenImageRole);
    }
  });

  it('derives geometry visibility from geometryParts', () => {
    for (const kind of Object.keys(ALL_ASSET_KINDS) as AssetKind[]) {
      const definition = getAssetKindDefinition(kind);
      expect(definition.getGeometryVisibilityDefaults()).toEqual(
        geometryVisibilityFromPartDescriptors(definition.geometryParts),
      );
      expect(definition.getGeometryVisibilityDefaults()).toEqual(
        defaultGeometryVisibilityForKind(kind),
      );
      expect(definition.getDefaultMaterials()).toEqual(defaultMaterialsForKind(kind));
    }
  });

  it('assigns material slots for visibility-and-material geometry parts', () => {
    for (const kind of Object.keys(ALL_ASSET_KINDS) as AssetKind[]) {
      const definition = getAssetKindDefinition(kind);
      const defaults = definition.getDefaultMaterials();
      for (const part of definition.geometryParts) {
        if (part.ui !== 'visibility-and-material') {continue;}
        expect(part.materialSlot).toBeDefined();
        expect(defaults[part.materialSlot!]).toBeDefined();
      }
    }
  });

  it('default entity slice keys match entity-registry create rules', () => {
    for (const kind of Object.keys(ALL_ASSET_KINDS) as AssetKind[]) {
      const slice = getDefaultEntitySliceForKind(kind);
      expect(Object.keys(slice).sort()).toEqual(
        [...EXPECTED_DEFAULT_SLICE_KEYS[kind]].sort(),
      );
    }
  });

  it('mergeKindParamPatch clamps block params', () => {
    const entity = {
      ...minimalEntity('block'),
      blockParams: defaultBlockParams(),
    };
    const merged = mergeKindParamPatch('block', entity, { widthM: 999 });
    const expected = clampBlockParams({ widthM: 999 }, defaultBlockParams());
    expect(merged.blockParams).toEqual(expected);
  });

  it('mergeKindParamPatch clamps beverage-can params', () => {
    const base = defaultBeverageCanParams('standard');
    const entity = {
      ...minimalEntity('beverage-can'),
      beverageCanParams: base,
    };
    const merged = mergeKindParamPatch('beverage-can', entity, { heightM: 999 });
    const expected = clampBeverageCanParams({ heightM: 999 }, base);
    expect(merged.beverageCanParams).toEqual(expected);
  });

  it('mergeKindParamPatch spreads print params without clamp', () => {
    const entity = {
      ...minimalEntity('print'),
      printParams: defaultPrintParams(),
    };
    const merged = mergeKindParamPatch('print', entity, { cornerRadiusMm: 2.5 });
    expect(merged.printParams).toEqual({ cornerRadiusMm: 2.5 });
  });

  it('cloneKindParamsFromEntity returns empty slice for picture', () => {
    expect(cloneKindParamsFromEntity('picture', minimalEntity('picture'))).toEqual(
      {},
    );
  });

  it('cloneKindParamsFromEntity copies block params and physics fields', () => {
    const entity = {
      ...minimalEntity('block'),
      blockParams: defaultBlockParams(),
      physicsBodyMode: 'fixed' as const,
      physicsDensityKgPerM3: 2500,
    };
    const cloned = cloneKindParamsFromEntity('block', entity);
    expect(cloned.blockParams).toEqual(defaultBlockParams());
    expect(cloned.physicsBodyMode).toBe('fixed');
    expect(cloned.physicsDensityKgPerM3).toBe(2500);
  });

  it('usesAsyncPackagingRebuild only for packaging kinds with async strategy', () => {
    const asyncKinds: AssetKind[] = ['beverage-can', 'tin-can', 'wine-bottle', 'pen'];
    for (const kind of Object.keys(ALL_ASSET_KINDS) as AssetKind[]) {
      expect(usesAsyncPackagingRebuild(kind)).toBe(asyncKinds.includes(kind));
    }
  });
});
