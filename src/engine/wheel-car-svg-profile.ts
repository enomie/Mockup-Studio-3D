import { Vector2 } from 'three/webgpu';
import { builtinLatheProfileUrl } from '@/constants/builtin-profile-paths';
import {
  WHEEL_CAR_SVG_AXIS_Y_MM,
  WHEEL_CAR_SVG_AXIAL_CENTER_MM,
  wheelCarUniformScale,
} from '@/scene/asset-wheel-car';
import {
  extractLathePathPointsBySlot,
  type LatheSvgPoint2,
} from './lathe-svg-path-slots';

;

type WheelCarSvgPartId = 'tire' | 'rimOuter' | 'rimInner';

export interface WheelCarLatheProfiles {
  tire: Vector2[];
  rimOuter: Vector2[];
  rimInner: Vector2[];
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
  };
}

/** SVG mm → Lathe profile (x = radius, y = axial) in meters, uniform scale from outer radius. */
function normalizeWheelCarPartPoints(
  raw: LatheSvgPoint2[],
  outerRadiusM: number,
): Vector2[] {
  if (raw.length < 3 || outerRadiusM <= 0) {
    return [];
  }

  const scale = wheelCarUniformScale(outerRadiusM);
  const mPerMm = scale / 1000;
  const normalized: Vector2[] = [];

  for (const p of raw) {
    const radiusM = (WHEEL_CAR_SVG_AXIS_Y_MM - p.y) * mPerMm;
    const axialM = (p.x - WHEEL_CAR_SVG_AXIAL_CENTER_MM) * mPerMm;
    normalized.push(new Vector2(radiusM, axialM));
  }

  return normalized;
}

export function normalizeWheelCarPaths(
  raw: RawWheelCarPaths,
  outerRadiusM: number,
): WheelCarLatheProfiles {
  return {
    tire: normalizeWheelCarPartPoints(raw.tire, outerRadiusM),
    rimOuter: normalizeWheelCarPartPoints(raw.rimOuter, outerRadiusM),
    rimInner: normalizeWheelCarPartPoints(raw.rimInner, outerRadiusM),
  };
}

function wheelCarSvgUrl(): string {
  return builtinLatheProfileUrl('lathe-x-wheel-car.svg');
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
  outerRadiusM: number,
): Promise<WheelCarLatheProfiles> {
  const raw = await loadRawWheelCarPaths();
  return normalizeWheelCarPaths(raw, outerRadiusM);
}

export function maxRadiusFromLatheProfile(points: Vector2[]): number {
  let maxR = 0;
  for (const p of points) {
    maxR = Math.max(maxR, p.x);
  }
  return maxR;
}

/** Lathe profile uses x = radius, y = axial (meters). */
export function latheProfileBandBounds(points: Vector2[]): {
  minRadiusM: number;
  maxRadiusM: number;
  minAxialM: number;
  maxAxialM: number;
} {
  let minRadiusM = Infinity;
  let maxRadiusM = -Infinity;
  let minAxialM = Infinity;
  let maxAxialM = -Infinity;
  for (const p of points) {
    minRadiusM = Math.min(minRadiusM, p.x);
    maxRadiusM = Math.max(maxRadiusM, p.x);
    minAxialM = Math.min(minAxialM, p.y);
    maxAxialM = Math.max(maxAxialM, p.y);
  }
  return { minRadiusM, maxRadiusM, minAxialM, maxAxialM };
}
