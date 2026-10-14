import type { AssetKind } from './asset-kind';
import { MM_TO_M } from '@/units/length';
import { clamp } from '@/units/math';

export interface WheelCarParams {
  outerRadiusM: number;
  tireWidthM: number;
  rimRadiusM: number;
  rimInsetM: number;
  hubRadiusM: number;
  hubDepthM: number;
  tireCornerRadiusMm: number;
  spokeCount: 5;
}

const DIM_MIN = 0.01;
const DIM_MAX = 2;
const OUTER_RADIUS_MIN = 0.05;
const CORNER_RADIUS_MM_MIN = 0;
const CORNER_EPSILON_M = 0.0001;
const MIN_SIDEWALL_M = 0.015;
const SPOKE_COUNT = 5 as const;

/** SVG [`wheel-car.svg`](../../public/profiles/lathe/wheel-car.svg) reference size (mm). */
export const WHEEL_CAR_SVG_OUTER_RADIUS_MM = 330.5;
export const WHEEL_CAR_SVG_TIRE_WIDTH_MM = 255;
export const WHEEL_CAR_SVG_AXIS_Y_MM = 330.5;
export const WHEEL_CAR_SVG_AXIAL_CENTER_MM = WHEEL_CAR_SVG_TIRE_WIDTH_MM / 2;

export function wheelCarUniformScale(outerRadiusM: number): number {
  return outerRadiusM / (WHEEL_CAR_SVG_OUTER_RADIUS_MM / 1000);
}

/** Default 255/30 R20 sport low-profile reference. */
export function defaultWheelCarParams(): WheelCarParams {
  return {
    outerRadiusM: 0.3305,
    tireWidthM: 0.255,
    rimRadiusM: 0.254,
    rimInsetM: 0.01,
    hubRadiusM: 0.048,
    hubDepthM: 0.025,
    tireCornerRadiusMm: 3.5,
    spokeCount: SPOKE_COUNT,
  };
}

export function cloneWheelCarParams(params: WheelCarParams): WheelCarParams {
  return { ...params };
}

export function isWheelCarAssetKind(kind: AssetKind): boolean {
  return kind === 'wheel-car';
}

export function clampWheelCarParams(
  partial: Partial<WheelCarParams>,
  base: WheelCarParams,
): WheelCarParams {
  const outerRadiusM = clamp(
    partial.outerRadiusM ?? base.outerRadiusM,
    OUTER_RADIUS_MIN,
    DIM_MAX,
  );
  const uniform = wheelCarUniformScale(outerRadiusM);
  const defaults = defaultWheelCarParams();
  const refScale = wheelCarUniformScale(defaults.outerRadiusM);

  const tireWidthM =
    partial.outerRadiusM !== undefined
      ? (WHEEL_CAR_SVG_TIRE_WIDTH_MM / 1000) * uniform
      : clamp(partial.tireWidthM ?? base.tireWidthM, DIM_MIN, DIM_MAX);

  let rimRadiusM = clamp(
    partial.rimRadiusM ?? (defaults.rimRadiusM / refScale) * uniform,
    DIM_MIN,
    outerRadiusM - MIN_SIDEWALL_M,
  );
  const rimInsetM = clamp(
    partial.rimInsetM ?? (defaults.rimInsetM / refScale) * uniform,
    0,
    tireWidthM * 0.25,
  );
  let hubRadiusM = clamp(
    partial.hubRadiusM ?? (defaults.hubRadiusM / refScale) * uniform,
    DIM_MIN,
    rimRadiusM - DIM_MIN,
  );
  const hubDepthM = clamp(
    partial.hubDepthM ?? (defaults.hubDepthM / refScale) * uniform,
    DIM_MIN,
    DIM_MAX,
  );

  rimRadiusM = Math.min(rimRadiusM, outerRadiusM - MIN_SIDEWALL_M);
  hubRadiusM = Math.min(hubRadiusM, rimRadiusM - DIM_MIN);

  const merged = {
    outerRadiusM,
    tireWidthM,
    rimRadiusM,
    rimInsetM,
    hubRadiusM,
    hubDepthM,
    tireCornerRadiusMm: defaults.tireCornerRadiusMm,
    spokeCount: SPOKE_COUNT,
  };

  const sidewallM = outerRadiusM - rimRadiusM;
  const maxCornerMm = Math.min(sidewallM * 1000, tireWidthM * 500);

  return {
    ...merged,
    tireCornerRadiusMm: clamp(merged.tireCornerRadiusMm, CORNER_RADIUS_MM_MIN, maxCornerMm),
  };
}

/** Fillet at outer tread shoulder (meters). */
export function effectiveTireCornerRadiusM(params: WheelCarParams): number {
  const radiusM = params.tireCornerRadiusMm * MM_TO_M;
  const sidewallM = params.outerRadiusM - params.rimRadiusM;
  const maxRadius = Math.min(sidewallM, params.tireWidthM * 0.5) - CORNER_EPSILON_M;
  return Math.max(0, Math.min(radiusM, maxRadius));
}
