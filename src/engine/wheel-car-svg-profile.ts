import { Vector2 } from 'three/webgpu';
import {
  DEFAULT_WHEEL_CAR_PROFILE_ID,
  resolveWheelCarProfile,
  wheelCarProfileFrameMm,
  type WheelCarProfileFrameMm,
} from '@/scene/asset-wheel-car';
import { loadProfileSvgText, profileCacheKey } from '@/scene/profile-registry';
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

/** Keyed by `profileCacheKey` of the resolved profile. */
const rawPathsCache = new Map<string, RawWheelCarPaths>();

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
function wheelSvgMmToMeters(
  raw: LatheSvgPoint2[],
  sizeScale: number,
  frame: WheelCarProfileFrameMm,
): Vector2[] {
  const k = MM_TO_M * sizeScale;
  return raw.map(
    (p) =>
      new Vector2(
        Math.max(0, frame.axisYMm - p.y) * k,
        (p.x - frame.axialCenterMm) * k,
      ),
  );
}

/** Every wheel part is a closed outline: closed + wound CCW so lathe faces point outward. */
function normalizeWheelCarPartPoints(
  raw: LatheSvgPoint2[],
  sizeScale: number,
  frame: WheelCarProfileFrameMm,
): Vector2[] {
  if (raw.length < 3 || sizeScale <= 0) {
    return [];
  }
  return closeAndOrientLatheContour(wheelSvgMmToMeters(raw, sizeScale, frame));
}

export function normalizeWheelCarPaths(
  raw: RawWheelCarPaths,
  sizeScale = 1,
  frame: WheelCarProfileFrameMm = wheelCarProfileFrameMm(),
): WheelCarLatheProfiles {
  return {
    tire: normalizeWheelCarPartPoints(raw.tire, sizeScale, frame),
    rimOuter: normalizeWheelCarPartPoints(raw.rimOuter, sizeScale, frame),
    rimInner: normalizeWheelCarPartPoints(raw.rimInner, sizeScale, frame),
    spoke: normalizeWheelCarPartPoints(raw.spoke, sizeScale, frame),
  };
}

async function loadRawWheelCarPaths(profileId: string): Promise<RawWheelCarPaths> {
  const { entry } = resolveWheelCarProfile(profileId);
  const key = profileCacheKey(entry);
  const cached = rawPathsCache.get(key);
  if (cached) {
    return cached;
  }
  const paths = extractWheelCarPathsFromSvgText(await loadProfileSvgText(entry));
  rawPathsCache.set(key, paths);
  return paths;
}

/** Test hook: preload the raw paths of a profile (default: the built-in wheel). */
export function setRawWheelCarPathsCache(
  paths: RawWheelCarPaths,
  profileId: string = DEFAULT_WHEEL_CAR_PROFILE_ID,
): void {
  rawPathsCache.set(profileCacheKey(resolveWheelCarProfile(profileId).entry), paths);
}

export function clearRawWheelCarPathsCache(): void {
  rawPathsCache.clear();
}

export async function loadWheelCarLatheProfiles(
  sizeScale = 1,
  profileId: string = DEFAULT_WHEEL_CAR_PROFILE_ID,
): Promise<WheelCarLatheProfiles> {
  const raw = await loadRawWheelCarPaths(profileId);
  return normalizeWheelCarPaths(raw, sizeScale, wheelCarProfileFrameMm(profileId));
}

export function maxRadiusFromLatheProfile(points: Vector2[]): number {
  let maxR = 0;
  for (const p of points) {
    maxR = Math.max(maxR, p.x);
  }
  return maxR;
}
