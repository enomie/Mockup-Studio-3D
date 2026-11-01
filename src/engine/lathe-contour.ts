import { Vector2 } from 'three/webgpu';
import { MM_TO_M } from '@/units/length';
import type { LatheSvgPoint2 } from './lathe-svg-path-slots';

/** Points closer than this to the axis count as "on the axis" (meters). */
const AXIS_EPSILON_M = 1e-6;
/** First/last points closer than this are treated as the same point (meters). */
const CLOSE_EPSILON_M = 1e-7;

/**
 * SVG (1 unit = 1 mm, y down) → lathe space in meters (x = radius, y up).
 * `footYMm` is the SVG y that becomes y = 0 (usually the lowest point of the asset).
 */
export function latheSvgMmToMeters(
  points: LatheSvgPoint2[],
  footYMm: number,
  scale = 1,
): Vector2[] {
  const k = MM_TO_M * scale;
  return points.map((p) => new Vector2(Math.max(0, p.x) * k, (footYMm - p.y) * k));
}

/** A contour that never touches the axis revolves into a ring with a hole (closed loop). */
export function isClosedLatheContour(points: Vector2[]): boolean {
  if (points.length < 3) {
    return false;
  }
  return points.every((p) => p.x > AXIS_EPSILON_M);
}

function signedArea(points: Vector2[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

/** Closes the loop and winds it counter-clockwise (y up) so lathe faces point outward. */
export function closeAndOrientLatheContour(points: Vector2[]): Vector2[] {
  const out = points.map((p) => p.clone());
  const first = out[0];
  const last = out[out.length - 1];
  if (first.distanceTo(last) > CLOSE_EPSILON_M) {
    out.push(first.clone());
  }
  return signedArea(out) < 0 ? out.reverse() : out;
}

/** LatheGeometry expects open profiles traced from bottom (y≈0) toward the top for outward-facing sides. */
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

/** Open profile (touches axis) → bottom-to-top; closed contour (ring) → closed + CCW. */
export function prepareLatheProfile(points: Vector2[]): Vector2[] {
  return isClosedLatheContour(points)
    ? closeAndOrientLatheContour(points)
    : orientLatheProfileBottomToTop(points);
}
