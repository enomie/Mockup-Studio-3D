import { Vector2 } from 'three/webgpu';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import type { BeverageCanBodyProfile } from './beverage-can-label-unfold';
import { beverageCanSvgUrl } from '@/scene/asset-beverage-can';

export type SvgPoint2 = { x: number; y: number };

const rawPointsCache = new Map<BeverageCanBodyProfile, SvgPoint2[]>();

export function normalizeSvgProfileToLathePoints(
  rawPoints: SvgPoint2[],
  heightM: number,
  diameterM: number,
): Vector2[] {
  if (rawPoints.length < 2 || heightM <= 0 || diameterM <= 0) {
    return [];
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of rawPoints) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const spanY = maxY - minY;
  const spanX = maxX - minX;
  if (spanY <= 0 || spanX <= 0) {
    return [];
  }

  const targetRadiusM = diameterM / 2;
  const scaleY = heightM / spanY;
  const scaleX = targetRadiusM / spanX;

  const normalized: Vector2[] = [];
  for (const p of rawPoints) {
    const x = (p.x - minX) * scaleX;
    const y = (maxY - p.y) * scaleY;
    normalized.push(new Vector2(x, y));
  }

  return orientLatheProfileBottomToTop(normalized);
}

/** LatheGeometry expects the profile traced from bottom (y≈0) toward the top for outward-facing sides. */
export function orientLatheProfileBottomToTop(points: Vector2[]): Vector2[] {
  if (points.length < 2) {
    return points;
  }

  const sampleCount = Math.min(4, points.length);
  let sumFirst = 0;
  let sumLast = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    sumFirst += points[i].y;
    sumLast += points[points.length - 1 - i].y;
  }
  const avgFirst = sumFirst / sampleCount;
  const avgLast = sumLast / sampleCount;

  if (avgFirst > avgLast) {
    return [...points].reverse();
  }
  return points;
}

export function extractPointsFromSvgText(svgText: string, curveSegments = 24): SvgPoint2[] {
  const loader = new SVGLoader();
  const data = loader.parse(svgText);
  const path = data.paths[0];
  if (!path) {
    return [];
  }

  const shapes = SVGLoader.createShapes(path);
  const shape = shapes[0];
  if (!shape) {
    return [];
  }

  return shape.getPoints(curveSegments).map((p) => ({ x: p.x, y: p.y }));
}

export async function fetchSvgText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load SVG: ${url} (${response.status})`);
  }
  return response.text();
}

export async function loadRawSvgProfilePoints(
  profile: BeverageCanBodyProfile,
): Promise<SvgPoint2[]> {
  const cached = rawPointsCache.get(profile);
  if (cached) {
    return cached;
  }

  const svgText = await fetchSvgText(beverageCanSvgUrl(profile));
  const points = extractPointsFromSvgText(svgText);
  rawPointsCache.set(profile, points);
  return points;
}

export function setRawSvgProfilePointsCache(
  profile: BeverageCanBodyProfile,
  points: SvgPoint2[],
): void {
  rawPointsCache.set(profile, points);
}

export function clearRawSvgProfilePointsCache(): void {
  rawPointsCache.clear();
}

export async function loadNormalizedLatheProfile(
  profile: BeverageCanBodyProfile,
  heightM: number,
  diameterM: number,
): Promise<Vector2[]> {
  const raw = await loadRawSvgProfilePoints(profile);
  return normalizeSvgProfileToLathePoints(raw, heightM, diameterM);
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
