import type { AssetKind } from './asset-kind';
import { isMonitorAssetKind, MONITOR_DEFAULT_BODY_DEPTH_MM } from './asset-monitor';
import { MM_TO_M } from '@/units/length';

/** Geometry params for handheld devices — mm values at sizeScale 1. */
export interface HandheldDeviceParams {
  screenCornerRadiusMm: number;
  bezelWidthMm: number;
  /** Outer perimeter edge roundness (front/back face to side wall), mm at sizeScale 1. */
  outerEdgeRadiusMm: number;
  bodyDepthMm?: number;
}

export const SMARTPHONE_REF_SCREEN_HEIGHT_M = 0.16;
export const TABLET_REF_SCREEN_HEIGHT_M = 0.25;

/** Portrait placeholder when no screen image is assigned (width / height). */
export const HANDHELD_PLACEHOLDER_ASPECT = 9 / 16;

const SMARTPHONE_DEFAULT_BODY_DEPTH_MM = 8;
/** Layer stack (1+1+1+1+1 mm parts + 1 mm gaps + optional 1 mm glass) fits in 8 mm. */
const TABLET_DEFAULT_BODY_DEPTH_MM = 8;

export const SIDE_BUTTON_LENGTH_MM = 14;
export const SIDE_BUTTON_THICKNESS_MM = 1.2;
/** Extra cutter depth beyond side-wall thickness (CSG stability + full through-cut). */
export const SIDE_BUTTON_HOLE_EXTRA_MM = 2;
export const SIDE_BUTTON_GAP_MM = 0.15;
export const SIDE_BUTTON_PROUD_MM = 2;
export const SIDE_BUTTON_INSET_MM = 2;
/** Edge-to-edge gap between the two stacked buttons. */
export const SIDE_BUTTON_SPACING_MM = 2.5;

/** Front glass (glazing) thickness. */
export const HANDHELD_FRONT_GLASS_THICKNESS_MM = 1;
/** Inner base backplate (screen opening contour). */
export const HANDHELD_INNER_BACK_PLATE_THICKNESS_MM = 1;
/** Outer backplate (screen opening contour). */
export const HANDHELD_OUTER_BACK_PLATE_THICKNESS_MM = 1;
/** Z gap between glass inner face and screen image — minimal to avoid z-fighting (polygonOffset on both). */
export const HANDHELD_GLASS_SCREEN_Z_GAP_MM = 0.02;
/** Z gap between back-stack layer faces (base back↔outer back). */
export const HANDHELD_LAYER_Z_GAP_MM = 1;
/** Z overhang — front glass and outer backplate protrude this far beyond the frame faces. */
export const HANDHELD_LAYER_Z_OVERHANG_MM = 0.5;
/** Panel + engine cap for outer edge roundness. */
const OUTER_EDGE_RADIUS_MAX_MM = 3;
const DEFAULT_SCREEN_CORNER_RADIUS_MM = 6;
const DEFAULT_BEZEL_WIDTH_MM = 1;
const DEFAULT_OUTER_EDGE_RADIUS_MM = 0.8;

export function isHandheldAssetKind(kind: AssetKind): boolean {
  return kind === 'smartphone' || kind === 'tablet';
}

export function defaultHandheldParams(kind: AssetKind): HandheldDeviceParams {
  const bodyDepthMm =
    kind === 'tablet'
      ? TABLET_DEFAULT_BODY_DEPTH_MM
      : SMARTPHONE_DEFAULT_BODY_DEPTH_MM;

  return {
    screenCornerRadiusMm: DEFAULT_SCREEN_CORNER_RADIUS_MM,
    bezelWidthMm: DEFAULT_BEZEL_WIDTH_MM,
    outerEdgeRadiusMm: DEFAULT_OUTER_EDGE_RADIUS_MM,
    bodyDepthMm,
  };
}

export function cloneHandheldParams(
  params: HandheldDeviceParams,
): HandheldDeviceParams {
  return { ...params };
}

export function resolveBodyDepthMm(
  kind: AssetKind,
  params?: HandheldDeviceParams,
): number {
  if (params?.bodyDepthMm !== undefined) {
    return params.bodyDepthMm;
  }
  if (isMonitorAssetKind(kind)) {
    return MONITOR_DEFAULT_BODY_DEPTH_MM;
  }
  return kind === 'tablet'
    ? TABLET_DEFAULT_BODY_DEPTH_MM
    : SMARTPHONE_DEFAULT_BODY_DEPTH_MM;
}

export function bezelWidthM(
  params: HandheldDeviceParams,
  sizeScale = 1,
): number {
  return params.bezelWidthMm * MM_TO_M * sizeScale;
}

export function screenCornerRadiusM(
  params: HandheldDeviceParams,
  screenWidth: number,
  screenHeight: number,
  sizeScale = 1,
): number {
  const radiusM = params.screenCornerRadiusMm * MM_TO_M * sizeScale;
  const maxRadius = Math.min(screenWidth, screenHeight) * 0.5 - 0.0001;
  return Math.min(radiusM, maxRadius);
}

export function clampOuterEdgeRadiusMm(
  radiusMm: number,
  bodyDepthMm: number,
): number {
  const maxMm = Math.min(OUTER_EDGE_RADIUS_MAX_MM, bodyDepthMm * 0.5);
  return Math.max(0, Math.min(radiusMm, maxMm));
}

export function outerEdgeRadiusM(
  params: HandheldDeviceParams,
  bodyDepthMm: number,
  sizeScale = 1,
): number {
  const radiusMm = clampOuterEdgeRadiusMm(
    params.outerEdgeRadiusMm,
    bodyDepthMm,
  );
  return radiusMm * MM_TO_M * sizeScale;
}
