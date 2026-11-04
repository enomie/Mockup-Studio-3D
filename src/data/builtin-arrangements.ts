import {
  cloneArrangementPreset,
  type ArrangementPreset,
  type ArrangementSpawn,
} from '@/scene/arrangement-types';
import { wheelCarDimensionsM } from '@/scene/asset-wheel-car';
import { MATERIAL_ALUMINUM_BRUSHED_ID } from '@/scene/material-ids';

export const BUILTIN_ARRANGEMENT_CLOTHING_ID = 'builtin-arrangement-clothing';
export const BUILTIN_ARRANGEMENT_DEVICES_ID = 'builtin-arrangement-devices';
const BUILTIN_ARRANGEMENT_BEVERAGES_ID = 'builtin-arrangement-beverages';
const BUILTIN_ARRANGEMENT_CAR_ID = 'builtin-arrangement-car';

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
  { assetKind: 'tablet', position: { x: -0.38, z: 0.12 }, rotationDeg: { y: 15 } },
  { assetKind: 'smartphone', position: { x: 0.36, z: 0.16 }, rotationDeg: { y: -15 } },
];

/** Two beverage cans in front, two wine bottles behind them. */
const BEVERAGES_ASSETS: readonly ArrangementSpawn[] = [
  { assetKind: 'beverage-can', position: { x: -0.1, z: 0.08 } },
  { assetKind: 'beverage-can', position: { x: 0.0, z: 0.12 } },
  { assetKind: 'wine-bottle', position: { x: -0.05, z: -0.06 } },
  { assetKind: 'wine-bottle', position: { x: 0.08, z: -0.02 } },
];

/**
 * Sports car wheel layout (Porsche 911, 992): wheelbase 2450 mm, track front 1589 mm,
 * rear 1557 mm (tire center to tire center). North (−Z) = driving direction;
 * the wheel axle is +X by default, so no rotation is needed.
 */
const CAR_WHEELBASE_M = 2.45;
const CAR_TRACK_FRONT_M = 1.589;
const CAR_TRACK_REAR_M = 1.557;

/** Wheel center height when the tire stands on the ground. */
const CAR_AXLE_HEIGHT_M = wheelCarDimensionsM().outerRadiusM;
const CAR_AXLE_RADIUS_M = 0.03;

/** Static wheel on the ground at an axle end. */
function carWheel(x: number, z: number): ArrangementSpawn {
  return { assetKind: 'wheel-car', position: { x, z }, physicsBodyMode: 'fixed' };
}

/**
 * Static axle cylinder from wheel center to wheel center along world X. The cylinder
 * pivot is its bottom cap; Rot Z +90° turns its +Y axis to −X, so it starts at +track/2.
 */
function carAxle(trackM: number, z: number): ArrangementSpawn {
  return {
    assetKind: 'cylinder',
    position: { x: trackM / 2, z },
    positionY: CAR_AXLE_HEIGHT_M,
    rotationDeg: { z: 90 },
    cylinderParams: { radiusM: CAR_AXLE_RADIUS_M, heightM: trackM },
    materialSlot: 'cylinderMaterialId',
    materialId: MATERIAL_ALUMINUM_BRUSHED_ID,
    physicsBodyMode: 'fixed',
  };
}

const CAR_ASSETS: readonly ArrangementSpawn[] = [
  carWheel(-CAR_TRACK_FRONT_M / 2, -CAR_WHEELBASE_M / 2),
  carWheel(CAR_TRACK_FRONT_M / 2, -CAR_WHEELBASE_M / 2),
  carWheel(-CAR_TRACK_REAR_M / 2, CAR_WHEELBASE_M / 2),
  carWheel(CAR_TRACK_REAR_M / 2, CAR_WHEELBASE_M / 2),
  carAxle(CAR_TRACK_FRONT_M, -CAR_WHEELBASE_M / 2),
  carAxle(CAR_TRACK_REAR_M, CAR_WHEELBASE_M / 2),
  {
    assetKind: 'block',
    position: { x: 0, z: 0 },
    positionY: 0.2613,
    blockParams: { widthM: 0.5, heightM: 0.2, depthM: 2.7, cornerRadiusMm: 5 },
    materialSlot: 'blockMaterialId',
    materialId: MATERIAL_ALUMINUM_BRUSHED_ID,
    physicsBodyMode: 'fixed',
    physicsDensityKgPerM3: 1000,
  },
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
  {
    id: BUILTIN_ARRANGEMENT_CAR_ID,
    name: 'Car',
    source: 'builtin',
    description: 'Four car wheels, two axles and a chassis block, sports car wheelbase and track (north = forward)',
    content: { kind: 'spawn', assets: CAR_ASSETS },
  },
];

export function resolveBuiltinArrangementPreset(id: string): ArrangementPreset | undefined {
  const preset = ARRANGEMENT_PRESETS.find((entry) => entry.id === id);
  return preset ? cloneArrangementPreset(preset) : undefined;
}

export function defaultArrangementSpawns(): readonly ArrangementSpawn[] {
  return CLOTHING_ASSETS;
}
