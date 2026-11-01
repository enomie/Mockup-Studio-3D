import {
  cloneArrangementPreset,
  type ArrangementPreset,
  type ArrangementSpawn,
} from '@/scene/arrangement-types';

export const BUILTIN_ARRANGEMENT_CLOTHING_ID = 'builtin-arrangement-clothing';
export const BUILTIN_ARRANGEMENT_DEVICES_ID = 'builtin-arrangement-devices';
export const BUILTIN_ARRANGEMENT_BEVERAGES_ID = 'builtin-arrangement-beverages';

/** Arrangement the app starts with. */
export const BUILTIN_ARRANGEMENT_DEFAULT_ID = BUILTIN_ARRANGEMENT_CLOTHING_ID;

/** Block on ground + silk fabric cloth elevated for physics/cloth staging. */
const CLOTHING_ASSETS: readonly ArrangementSpawn[] = [
  { assetKind: 'block', position: { x: 0, z: 0 } },
  {
    assetKind: 'fabric-cloth',
    position: { x: 0, z: 0 },
    positionY: 0.5,
    materialSlot: 'fabricClothMaterialId',
    materialId: 'material-silk',
  },
];

/** Desktop monitor in the back, tablet and smartphone in front of it. */
const DEVICES_ASSETS: readonly ArrangementSpawn[] = [
  { assetKind: 'monitor', position: { x: 0, z: -0.15 } },
  { assetKind: 'tablet', position: { x: -0.38, z: 0.12 }, rotationYDeg: 15 },
  { assetKind: 'smartphone', position: { x: 0.36, z: 0.16 }, rotationYDeg: -15 },
];

/** Two beverage cans in front, two wine bottles behind them. */
const BEVERAGES_ASSETS: readonly ArrangementSpawn[] = [
  { assetKind: 'beverage-can', position: { x: -0.1, z: 0.08 } },
  { assetKind: 'beverage-can', position: { x: 0.0, z: 0.12 } },
  { assetKind: 'wine-bottle', position: { x: -0.05, z: -0.06 } },
  { assetKind: 'wine-bottle', position: { x: 0.08, z: -0.02 } },
];

export const ARRANGEMENT_PRESETS: readonly ArrangementPreset[] = [
  {
    id: BUILTIN_ARRANGEMENT_CLOTHING_ID,
    name: 'Clothing',
    source: 'builtin',
    description: 'Block with a silk cloth above it for cloth physics',
    content: { kind: 'spawn', assets: CLOTHING_ASSETS },
  },
  {
    id: BUILTIN_ARRANGEMENT_DEVICES_ID,
    name: 'Devices',
    source: 'builtin',
    description: 'Desktop monitor, tablet and smartphone',
    content: { kind: 'spawn', assets: DEVICES_ASSETS },
  },
  {
    id: BUILTIN_ARRANGEMENT_BEVERAGES_ID,
    name: 'Beverages',
    source: 'builtin',
    description: 'Beverage cans and wine bottles',
    content: { kind: 'spawn', assets: BEVERAGES_ASSETS },
  },
];

export function resolveBuiltinArrangementPreset(id: string): ArrangementPreset | undefined {
  const preset = ARRANGEMENT_PRESETS.find((entry) => entry.id === id);
  return preset ? cloneArrangementPreset(preset) : undefined;
}

export function defaultArrangementSpawns(): readonly ArrangementSpawn[] {
  return CLOTHING_ASSETS;
}
