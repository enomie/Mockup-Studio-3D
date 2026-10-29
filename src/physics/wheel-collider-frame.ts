import type { Quat } from './types';

const HALF_PI = Math.PI / 2;

/** Rapier wheel collider: cylinder axis local X after this rotation (matches rigid-collider-desc). */
export const WHEEL_COLLIDER_AXLE_QUATERNION: Quat = {
  x: 0,
  y: 0,
  z: Math.sin(HALF_PI / 2),
  w: Math.cos(HALF_PI / 2),
};
