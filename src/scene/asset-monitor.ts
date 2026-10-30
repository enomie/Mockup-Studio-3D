import type { AssetKind } from './asset-kind';
import type { HandheldDeviceParams } from './asset-handheld';
import { MM_TO_M } from '@/units/length';

export const MONITOR_REF_SCREEN_WIDTH_M = 0.48;
export const MONITOR_PLACEHOLDER_ASPECT = 16 / 9;
export const MONITOR_DEFAULT_BODY_DEPTH_MM = 15;

export const MONITOR_DEFAULT_STAND_BASE_HEIGHT_MM = 7;
export const MONITOR_DEFAULT_STAND_BASE_WIDTH_MM = 250;
export const MONITOR_DEFAULT_STAND_BASE_DEPTH_MM = 120;
export const MONITOR_DEFAULT_STAND_FOOT_OFFSET_Z_MM = 40;
export const MONITOR_DEFAULT_STAND_BASE_CORNER_RADIUS_MM = 8;
export const MONITOR_DEFAULT_STAND_FOOT_WIDTH_MM = 70;
export const MONITOR_DEFAULT_STAND_FOOT_DEPTH_MM = 7;
export const MONITOR_DEFAULT_STAND_FOOT_HEIGHT_MM = 300;
export const MONITOR_DEFAULT_DISPLAY_MOUNT_HEIGHT_MM = 70;

export const MONITOR_DISPLAY_TILT_MIN_DEG = -15;
export const MONITOR_DISPLAY_TILT_MAX_DEG = 15;

export type MonitorDeviceParams = HandheldDeviceParams & {
  standBaseWidthMm: number;
  standBaseDepthMm: number;
  standBaseCornerRadiusMm: number;
  standBaseHeightMm: number;
  standFootWidthMm: number;
  standFootDepthMm: number;
  standFootHeightMm: number;
  /** Foot (+ display pivot) center offset toward back (−Z), mm at sizeScale 1. */
  standFootOffsetZMm: number;
  displayTiltDeg: number;
  /** Pivot height along foot, measured from foot bottom (on top of stand base). */
  displayMountHeightMm: number;
};

export function isMonitorAssetKind(kind: AssetKind): kind is 'monitor' {
  return kind === 'monitor';
}

export function defaultMonitorParams(): MonitorDeviceParams {
  return {
    screenCornerRadiusMm: 7,
    bezelWidthMm: 7,
    outerEdgeRadiusMm: 1,
    bodyDepthMm: MONITOR_DEFAULT_BODY_DEPTH_MM,
    standBaseWidthMm: MONITOR_DEFAULT_STAND_BASE_WIDTH_MM,
    standBaseDepthMm: MONITOR_DEFAULT_STAND_BASE_DEPTH_MM,
    standBaseCornerRadiusMm: MONITOR_DEFAULT_STAND_BASE_CORNER_RADIUS_MM,
    standBaseHeightMm: MONITOR_DEFAULT_STAND_BASE_HEIGHT_MM,
    standFootWidthMm: MONITOR_DEFAULT_STAND_FOOT_WIDTH_MM,
    standFootDepthMm: MONITOR_DEFAULT_STAND_FOOT_DEPTH_MM,
    standFootHeightMm: MONITOR_DEFAULT_STAND_FOOT_HEIGHT_MM,
    standFootOffsetZMm: MONITOR_DEFAULT_STAND_FOOT_OFFSET_Z_MM,
    displayTiltDeg: 0,
    displayMountHeightMm: MONITOR_DEFAULT_DISPLAY_MOUNT_HEIGHT_MM,
  };
}

export function cloneMonitorParams(params: MonitorDeviceParams): MonitorDeviceParams {
  return { ...params };
}

export function clampDisplayTiltDeg(deg: number): number {
  return Math.max(
    MONITOR_DISPLAY_TILT_MIN_DEG,
    Math.min(MONITOR_DISPLAY_TILT_MAX_DEG, deg),
  );
}

export function clampDisplayMountHeightMm(
  heightMm: number,
  footHeightMm: number,
): number {
  return Math.max(0, Math.min(footHeightMm, heightMm));
}

/** Stand base + foot heights in meters (Y up). */
export function monitorStandHeightsM(
  params: MonitorDeviceParams,
  sizeScale = 1,
): { baseHeightM: number; footHeightM: number } {
  const mm = MM_TO_M * sizeScale;
  return {
    baseHeightM: params.standBaseHeightMm * mm,
    footHeightM: params.standFootHeightMm * mm,
  };
}

export function monitorMountHeightM(
  params: MonitorDeviceParams,
  sizeScale = 1,
): number {
  const clamped = clampDisplayMountHeightMm(
    params.displayMountHeightMm,
    params.standFootHeightMm,
  );
  return clamped * MM_TO_M * sizeScale;
}
