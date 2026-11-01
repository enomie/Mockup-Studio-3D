import { Vector2 } from 'three/webgpu';
import { builtinLatheProfileUrl } from '@/constants/builtin-profile-paths';
import {
  WHEEL_CAR_SVG_AXIS_Y_MM,
  WHEEL_CAR_SVG_FILE,
  WHEEL_CAR_SVG_AXIAL_CENTER_MM,
} from '@/scene/asset-wheel-car';
import { MM_TO_M } from '@/units/length';
import { closeAndOrientLatheContour } from './lathe-contour';
import {
  extractLathePathPointsBySlot,
  type LatheSvgPoint2,
} from './lathe-svg-path-slots';

type WheelCarSvgPartId = 'tire' | 'rimOuter' | 'rimInner' | 'spoke';

/** Profiles in meters: x = radius, y = axial (centered on the tire). */
export interface WheelCarLatheProfiles {
  tire: Vector2[];
  rimOuter: Vector2[];
  rimInner: Vector2[];
  /** Spoke side view (`path_orange`), closed outline — extruded, not lathed. */
  spoke: Vector2[];
}

type RawWheelCarPaths = Record<WheelCarSvgPartId, LatheSvgPoint2[]>;

let rawPathsCache: RawWheelCarPaths | null = null;

export function extractWheelCarPathsFromSvgText(
  svgText: string,
  curveSegments = 32,
): RawWheelCarPaths {
  const slots = extractLathePathPointsBySlot(svgText, curveSegments);
  return {
    tire: slots[0],
    rimOuter: slots[1],
    rimInner: slots[2],
    spoke: slots[6],
  };
}

/** SVG mm (x = axial, y down to the axis) → meters (x = radius, y = axial), × `sizeScale`. */
function wheelSvgMmToMeters(raw: LatheSvgPoint2[], sizeScale: number): Vector2[] {
  const k = MM_TO_M * sizeScale;
  return raw.map(
    (p) =>
      new Vector2(
        Math.max(0, WHEEL_CAR_SVG_AXIS_Y_MM - p.y) * k,
        (p.x - WHEEL_CAR_SVG_AXIAL_CENTER_MM) * k,
      ),
  );
}

/** Every wheel part is a closed outline: closed + wound CCW so lathe faces point outward. */
function normalizeWheelCarPartPoints(raw: LatheSvgPoint2[], sizeScale: number): Vector2[] {
  if (raw.length < 3 || sizeScale <= 0) {
    return [];
  }
  return closeAndOrientLatheContour(wheelSvgMmToMeters(raw, sizeScale));
}

export function normalizeWheelCarPaths(
  raw: RawWheelCarPaths,
  sizeScale = 1,
): WheelCarLatheProfiles {
  return {
    tire: normalizeWheelCarPartPoints(raw.tire, sizeScale),
    rimOuter: normalizeWheelCarPartPoints(raw.rimOuter, sizeScale),
    rimInner: normalizeWheelCarPartPoints(raw.rimInner, sizeScale),
    spoke: normalizeWheelCarPartPoints(raw.spoke, sizeScale),
  };
}

function wheelCarSvgUrl(): string {
  return builtinLatheProfileUrl(WHEEL_CAR_SVG_FILE);
}

async function fetchSvgText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load SVG: ${url} (${response.status})`);
  }
  return response.text();
}

async function loadRawWheelCarPaths(): Promise<RawWheelCarPaths> {
  if (rawPathsCache) {
    return rawPathsCache;
  }
  const svgText = await fetchSvgText(wheelCarSvgUrl());
  const paths = extractWheelCarPathsFromSvgText(svgText);
  rawPathsCache = paths;
  return paths;
}

export function setRawWheelCarPathsCache(paths: RawWheelCarPaths): void {
  rawPathsCache = paths;
}

export function clearRawWheelCarPathsCache(): void {
  rawPathsCache = null;
}

export async function loadWheelCarLatheProfiles(
  sizeScale = 1,
): Promise<WheelCarLatheProfiles> {
  const raw = await loadRawWheelCarPaths();
  return normalizeWheelCarPaths(raw, sizeScale);
}

export function maxRadiusFromLatheProfile(points: Vector2[]): number {
  let maxR = 0;
  for (const p of points) {
    maxR = Math.max(maxR, p.x);
  }
  return maxR;
}
