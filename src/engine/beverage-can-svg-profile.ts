import type { Vector2 } from 'three/webgpu';
import type { BeverageCanBodyProfile } from './beverage-can-label-unfold';
import {
  beverageCanProfileMm,
  resolveBeverageCanProfile,
} from '@/scene/beverage-can-profile-metrics';
import { loadProfileSvgText, profileCacheKey } from '@/scene/profile-registry';
import { latheSvgMmToMeters, prepareLatheProfile } from './lathe-contour';
import {
  extractLathePathPointsBySlot,
  type LatheSvgPoint2,
} from './lathe-svg-path-slots';

/** Raw SVG paths (1 unit = 1 mm, y down): `path_red` body, `path_green` top ring. */
export interface BeverageCanRawPaths {
  body: LatheSvgPoint2[];
  ring: LatheSvgPoint2[];
}

/** Lathe profiles in meters (x = radius, y up, foot at y = 0). */
export interface BeverageCanLatheProfiles {
  body: Vector2[];
  ring: Vector2[];
}

/** Keyed by `profileCacheKey` of the resolved profile. */
const rawPathsCache = new Map<string, BeverageCanRawPaths>();

export function extractBeverageCanPathsFromSvgText(
  svgText: string,
  curveSegments = 24,
): BeverageCanRawPaths {
  const slots = extractLathePathPointsBySlot(svgText, curveSegments);
  return { body: slots[0], ring: slots[1] };
}

/** SVG mm → meters without stretching; body and ring share one transform. */
export function normalizeBeverageCanPaths(
  raw: BeverageCanRawPaths,
  footYMm: number,
  sizeScale = 1,
): BeverageCanLatheProfiles {
  return {
    body: prepareLatheProfile(latheSvgMmToMeters(raw.body, footYMm, sizeScale)),
    ring: prepareLatheProfile(latheSvgMmToMeters(raw.ring, footYMm, sizeScale)),
  };
}

async function loadRawBeverageCanPaths(
  profile: BeverageCanBodyProfile,
): Promise<BeverageCanRawPaths> {
  const { entry } = resolveBeverageCanProfile(profile);
  const key = profileCacheKey(entry);
  const cached = rawPathsCache.get(key);
  if (cached) {
    return cached;
  }
  const paths = extractBeverageCanPathsFromSvgText(await loadProfileSvgText(entry));
  rawPathsCache.set(key, paths);
  return paths;
}

export async function loadBeverageCanLatheProfiles(
  profile: BeverageCanBodyProfile,
  sizeScale = 1,
): Promise<BeverageCanLatheProfiles> {
  const raw = await loadRawBeverageCanPaths(profile);
  return normalizeBeverageCanPaths(raw, beverageCanProfileMm(profile).footYMm, sizeScale);
}

/**
 * Outer mantle radius at height y — interpolated along the lathe profile polyline.
 * Uses the maximum x on any segment crossing y (outer silhouette).
 */
export function sampleProfileRadiusAtY(points: Vector2[], y: number): number {
  if (points.length === 0) {
    return 0;
  }

  let radius = 0;
  let foundSegment = false;

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const yMin = Math.min(a.y, b.y);
    const yMax = Math.max(a.y, b.y);
    if (y < yMin || y > yMax) {
      continue;
    }
    const dy = b.y - a.y;
    const t = Math.abs(dy) < 1e-12 ? 0 : (y - a.y) / dy;
    const x = a.x + t * (b.x - a.x);
    radius = Math.max(radius, x);
    foundSegment = true;
  }

  if (foundSegment) {
    return radius;
  }

  let closest = points[0];
  for (const p of points) {
    if (Math.abs(p.y - y) < Math.abs(closest.y - y)) {
      closest = p;
    }
  }
  return closest.x;
}

export function latheProfileBounds(points: Vector2[]): {
  minY: number;
  maxY: number;
  maxRadius: number;
} {
  let minY = Infinity;
  let maxY = -Infinity;
  let maxRadius = 0;
  for (const p of points) {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    maxRadius = Math.max(maxRadius, p.x);
  }
  return { minY, maxY, maxRadius };
}
