import { PHYSICS_COLLIDER_MARGIN_M } from './constants';
import type { HalfExtents } from './types';

/** Outward shell on each axis — visual mesh unchanged; see requirements-physics.md. */
export function inflateHalfExtentsForPhysics(half: HalfExtents): HalfExtents {
  const m = PHYSICS_COLLIDER_MARGIN_M;
  return {
    x: half.x + m,
    y: half.y + m,
    z: half.z + m,
  };
}
