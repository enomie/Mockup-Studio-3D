import type { AssetKind } from './asset-kind';
import { LATHE_PROFILE_METRICS_MM } from '@/data/lathe-profile-metrics.generated';
import { MM_TO_M } from '@/units/length';

/**
 * Shape and size come from the profile SVG; the instance scales via `entity.sizeScale`.
 * Spoke width is engine-side (tangential extrusion of the drawn spoke side view).
 */
export interface WheelCarParams {
  spokeCount: 5;
}

const SPOKE_COUNT = 5 as const;

/** Shipped x-lathe profile (public/profiles/lathe, 1 unit = 1 mm). */
export const WHEEL_CAR_SVG_FILE = 'lathe-x-wheel-car.svg';

/** Reference sizes measured from the SVG (mm): axis = lowest point (y down), tread = y 0. */
const WHEEL_CAR_SVG_BOUNDS_MM = LATHE_PROFILE_METRICS_MM[WHEEL_CAR_SVG_FILE].bounds;
export const WHEEL_CAR_SVG_AXIS_Y_MM = WHEEL_CAR_SVG_BOUNDS_MM.maxY;
const WHEEL_CAR_SVG_OUTER_RADIUS_MM = WHEEL_CAR_SVG_AXIS_Y_MM - WHEEL_CAR_SVG_BOUNDS_MM.minY;
const WHEEL_CAR_SVG_TIRE_WIDTH_MM = WHEEL_CAR_SVG_BOUNDS_MM.maxX - WHEEL_CAR_SVG_BOUNDS_MM.minX;
export const WHEEL_CAR_SVG_AXIAL_CENTER_MM =
  WHEEL_CAR_SVG_BOUNDS_MM.minX + WHEEL_CAR_SVG_TIRE_WIDTH_MM / 2;

export interface WheelCarDimensionsM {
  outerRadiusM: number;
  tireWidthM: number;
}

/** Outer radius and tire width measured from the SVG × `sizeScale`. */
export function wheelCarDimensionsM(sizeScale = 1): WheelCarDimensionsM {
  return {
    outerRadiusM: WHEEL_CAR_SVG_OUTER_RADIUS_MM * MM_TO_M * sizeScale,
    tireWidthM: WHEEL_CAR_SVG_TIRE_WIDTH_MM * MM_TO_M * sizeScale,
  };
}

export function defaultWheelCarParams(): WheelCarParams {
  return { spokeCount: SPOKE_COUNT };
}

export function cloneWheelCarParams(params: WheelCarParams): WheelCarParams {
  return { ...params };
}

export function isWheelCarAssetKind(kind: AssetKind): kind is 'wheel-car' {
  return kind === 'wheel-car';
}

/** Legacy params (outerRadiusM, rimRadiusM, …) are dropped — sizes come from the SVG. */
export function clampWheelCarParams(
  _partial: Partial<WheelCarParams>,
  _base: WheelCarParams,
): WheelCarParams {
  return { spokeCount: SPOKE_COUNT };
}
