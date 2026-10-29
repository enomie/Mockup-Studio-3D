import { Vector2 } from 'three/webgpu';
import {
  type WineBottleBodyProfile,
  wineBottleSvgUrl,
} from '@/scene/asset-wine-bottle';
import {
  extractLatheSubpathPointsBySlot,
  type LatheSvgPoint2,
} from './lathe-svg-path-slots';

export type WineBottleSvgPoint2 = LatheSvgPoint2;

const rawPointsCache = new Map<WineBottleBodyProfile, WineBottleSvgPoint2[]>();

/** Tessellate first SVG subpath (closed wall loop in Illustrator, punt hole ≥ ~1 SVG unit). */
export function extractOpenPathPointsFromSvgText(
  svgText: string,
  curveSegments = 48,
): WineBottleSvgPoint2[] {
  return extractLatheSubpathPointsBySlot(svgText, 0, curveSegments);
}

/** Scale open-wall SVG polyline to lathe space (radius × height, foot at y ≈ 0). */
export function normalizeOpenWallSvgToLathePoints(
  rawPoints: WineBottleSvgPoint2[],
  heightM: number,
): Vector2[] {
  if (rawPoints.length < 2 || heightM <= 0) {
    return [];
  }

  let maxY = -Infinity;
  for (const p of rawPoints) {
    maxY = Math.max(maxY, p.y);
  }

  const minY = rawPoints.reduce((m, p) => Math.min(m, p.y), Infinity);
  const spanY = maxY - minY;
  if (spanY <= 0) {
    return [];
  }

  const scale = heightM / spanY;
  const normalized: Vector2[] = [];
  for (const p of rawPoints) {
    const x = Math.max(0, p.x) * scale;
    const y = (maxY - p.y) * scale;
    normalized.push(new Vector2(x, y));
  }

  return normalized;
}

/**
 * Outer radius at height y (max x on wall segments at y).
 * Pass the same open polyline as LatheGeometry: output of `prepareWineBottleGlassLatheProfile`,
 * not raw `normalizeOpenWallSvgToLathePoints` only.
 */
export function sampleWineBottleRadiusAtY(wallProfile: Vector2[], y: number): number {
  if (wallProfile.length === 0) {
    return 0;
  }
  if (wallProfile.length === 1) {
    return wallProfile[0].x;
  }

  let maxRadius = 0;
  let found = false;
  for (let i = 0; i < wallProfile.length - 1; i += 1) {
    const a = wallProfile[i];
    const b = wallProfile[i + 1];
    const yMin = Math.min(a.y, b.y);
    const yMax = Math.max(a.y, b.y);
    if (y < yMin - 1e-12 || y > yMax + 1e-12) {
      continue;
    }
    const dy = b.y - a.y;
    let r: number;
    if (Math.abs(dy) < 1e-12) {
      r = Math.max(a.x, b.x);
    } else {
      const t = (y - a.y) / dy;
      if (t < 0 || t > 1) {
        continue;
      }
      r = a.x + t * (b.x - a.x);
    }
    maxRadius = Math.max(maxRadius, r);
    found = true;
  }

  if (found) {
    return maxRadius;
  }

  let closest = wallProfile[0];
  for (const p of wallProfile) {
    if (Math.abs(p.y - y) < Math.abs(closest.y - y)) {
      closest = p;
    }
  }
  return closest.x;
}

const WALL_RADIUS_EPS_M = 1e-6;
const WALL_INNER_OUTER_MIN_GAP_M = 1e-6;

function collectWallRadiiAtY(wallProfile: Vector2[], y: number): number[] {
  const radii: number[] = [];
  if (wallProfile.length < 2) {
    return radii;
  }

  for (let i = 0; i < wallProfile.length - 1; i += 1) {
    const a = wallProfile[i];
    const b = wallProfile[i + 1];
    const yMin = Math.min(a.y, b.y);
    const yMax = Math.max(a.y, b.y);
    if (y < yMin - 1e-12 || y > yMax + 1e-12) {
      continue;
    }
    const dy = b.y - a.y;
    if (Math.abs(dy) < 1e-12) {
      if (a.x > WALL_RADIUS_EPS_M) {
        radii.push(a.x);
      }
      if (b.x > WALL_RADIUS_EPS_M) {
        radii.push(b.x);
      }
      continue;
    }
    const t = (y - a.y) / dy;
    if (t < 0 || t > 1) {
      continue;
    }
    const r = a.x + t * (b.x - a.x);
    if (r > WALL_RADIUS_EPS_M) {
      radii.push(r);
    }
  }

  return radii;
}

export interface WineBottleWallRadiiAtY {
  rOuter: number;
  rInner: number;
}

/**
 * Inner and outer radius on a horizontal cut through the wall profile.
 * Returns null when fewer than two distinct radii exist (e.g. outer-only open SVG).
 */
export function sampleWineBottleWallRadiiAtY(
  wallProfile: Vector2[],
  y: number,
): WineBottleWallRadiiAtY | null {
  const radii = collectWallRadiiAtY(wallProfile, y);
  if (radii.length < 2) {
    return null;
  }
  const rOuter = Math.max(...radii);
  const rInner = Math.min(...radii);
  if (rOuter - rInner < WALL_INNER_OUTER_MIN_GAP_M) {
    return null;
  }
  return { rOuter, rInner };
}

/**
 * Stirn ring radii at y. Uses profile wall cut when available; otherwise derives inner
 * edge from `wallThicknessM` when `rOuter` is known (open outer SVG).
 */
export function resolveWineBottleStirnRadiiAtY(
  wallProfile: Vector2[],
  y: number,
  wallThicknessM: number,
): WineBottleWallRadiiAtY | null {
  const fromProfile = sampleWineBottleWallRadiiAtY(wallProfile, y);
  if (fromProfile) {
    return fromProfile;
  }
  if (wallThicknessM <= 0) {
    return null;
  }
  const rOuter = sampleWineBottleRadiusAtY(wallProfile, y);
  if (rOuter <= WALL_RADIUS_EPS_M) {
    return null;
  }
  const rInner = Math.max(WALL_RADIUS_EPS_M, rOuter - wallThicknessM);
  if (rOuter - rInner < WALL_INNER_OUTER_MIN_GAP_M) {
    return null;
  }
  return { rOuter, rInner };
}

export function wineBottleLatheProfileBounds(points: Vector2[]): {
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

async function loadRawWineBottleSvgPoints(
  profile: WineBottleBodyProfile,
): Promise<WineBottleSvgPoint2[]> {
  const reloadSvgEachTime = import.meta.env.DEV && !import.meta.env.VITEST;
  if (!reloadSvgEachTime) {
    const cached = rawPointsCache.get(profile);
    if (cached) {
      return cached;
    }
  }

  const url = wineBottleSvgUrl(profile);
  const response = await fetch(url, reloadSvgEachTime ? { cache: 'no-store' } : undefined);
  if (!response.ok) {
    throw new Error(`Failed to load SVG: ${url} (${response.status})`);
  }
  const points = extractOpenPathPointsFromSvgText(await response.text(), 48);
  if (!reloadSvgEachTime) {
    rawPointsCache.set(profile, points);
  }
  return points;
}

/** Normalized open wall from `public/profiles/lathe/lathe-y-bottle-*-open.svg`. */
export async function loadWineBottleOpenWallProfile(
  profile: WineBottleBodyProfile,
  heightM: number,
): Promise<Vector2[]> {
  const raw = await loadRawWineBottleSvgPoints(profile);
  return normalizeOpenWallSvgToLathePoints(raw, heightM);
}

export function setRawWineBottleSvgPointsCache(
  profile: WineBottleBodyProfile,
  points: WineBottleSvgPoint2[],
): void {
  rawPointsCache.set(profile, points);
}

export function clearRawWineBottleSvgPointsCache(): void {
  rawPointsCache.clear();
}
