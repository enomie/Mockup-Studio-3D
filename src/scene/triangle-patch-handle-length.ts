import type { Vec3 } from './entity-types';
import type { PatchPoint } from './asset-triangle-patch';

/** Below this length a handle has no usable direction. */
export const HANDLE_DIR_EPS = 1e-4;

type HandleKey = 'handleNext' | 'handlePrev' | 'handleCrossIn' | 'handleCrossOut';

const OPPOSITE: Record<HandleKey, HandleKey> = {
  handleNext: 'handlePrev',
  handlePrev: 'handleNext',
  handleCrossIn: 'handleCrossOut',
  handleCrossOut: 'handleCrossIn',
};

/** Unit vector from `from` to `to`, or null when they (nearly) coincide. */
export function unitDir(from: Vec3, to: Vec3): Vec3 | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz);
  if (len <= HANDLE_DIR_EPS) {return null;}
  return { x: dx / len, y: dy / len, z: dz / len };
}

/**
 * Fallback direction for a zero-length handle, derived from the patch:
 * 1. the opposite handle of the same point, mirrored;
 * 2. for along handles, the edge towards the neighboring point (next / previous).
 * Returns null when nothing usable exists.
 */
export function deriveHandleDirection(points: PatchPoint[], pointId: string, key: HandleKey): Vec3 | null {
  const index = points.findIndex((p) => p.id === pointId);
  if (index < 0) {return null;}
  const point = points[index];

  const opposite = unitDir(point[OPPOSITE[key]], point.pos);
  if (opposite) {return opposite;}

  if ((key === 'handleNext' || key === 'handlePrev') && points.length > 1) {
    const step = key === 'handleNext' ? 1 : -1;
    const neighbor = points[(index + step + points.length) % points.length];
    return unitDir(point.pos, neighbor.pos);
  }
  return null;
}

/** Tip position at `length` from `anchor` along unit `dir`. */
export function handleTipAt(anchor: Vec3, dir: Vec3, length: number): Vec3 {
  return { x: anchor.x + dir.x * length, y: anchor.y + dir.y * length, z: anchor.z + dir.z * length };
}
