/**
 * Single source of truth for cardinal directions and plan quadrants.
 *
 * Three.js is right-handed with Y up. Seen from above (+Y toward the viewer)
 * with +X to the right, +Z points DOWN on the plan. Therefore:
 *   North = -Z, East = +X, South = +Z, West = -X.
 * This mapping needs no projection mirroring and no axis swapping.
 * The default camera sits in the south (+Z) and looks north (-Z),
 * so East appears on the right of the screen.
 *
 * Quadrants run clockwise seen from above, starting north-east.
 */

export type CardinalId = 'north' | 'east' | 'south' | 'west';

export interface CardinalDirection {
  id: CardinalId;
  label: string;
  short: string;
  /** Unit vector on the XZ plane. */
  x: number;
  z: number;
  color: number;
}

export const CARDINAL_DIRECTIONS: readonly CardinalDirection[] = [
  { id: 'north', label: 'North', short: 'N', x: 0, z: -1, color: 0xff3b30 },
  { id: 'east', label: 'East', short: 'E', x: 1, z: 0, color: 0xffc400 },
  { id: 'south', label: 'South', short: 'S', x: 0, z: 1, color: 0xf2f2f2 },
  { id: 'west', label: 'West', short: 'W', x: -1, z: 0, color: 0x2ecc71 },
];

export type QuadrantId = 'alpha' | 'beta' | 'gamma' | 'delta';

export interface PlanQuadrant {
  id: QuadrantId;
  label: string;
  /** Sign of X and Z inside the quadrant. */
  signX: 1 | -1;
  signZ: 1 | -1;
}

export const PLAN_QUADRANTS: readonly PlanQuadrant[] = [
  { id: 'alpha', label: 'North-east', signX: 1, signZ: -1 },
  { id: 'beta', label: 'South-east', signX: 1, signZ: 1 },
  { id: 'gamma', label: 'South-west', signX: -1, signZ: 1 },
  { id: 'delta', label: 'North-west', signX: -1, signZ: -1 },
];

export function cardinal(id: CardinalId): CardinalDirection {
  const found = CARDINAL_DIRECTIONS.find((d) => d.id === id);
  if (!found) {throw new Error(`Unknown cardinal direction: ${id}`);}
  return found;
}

/** Yaw (rotation around +Y) that turns a +Z-pointing shape toward the direction. */
export function cardinalYaw(direction: CardinalDirection): number {
  return Math.atan2(direction.x, direction.z);
}
