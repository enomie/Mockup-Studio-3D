import { describe, expect, it } from 'vitest';
import {
  RIGID_TEST_BOTTOM_Y_M,
  RIGID_TEST_HALF_M,
  rigidTestRandomSpawnRotation,
  rigidTestSpawnCenterY,
  rigidTestSpawnPosition,
} from './physics-rigid-test';

describe('physics-rigid-test spawn', () => {
  it('places cube center at bottom height plus half edge', () => {
    expect(rigidTestSpawnCenterY()).toBe(RIGID_TEST_BOTTOM_Y_M + RIGID_TEST_HALF_M);
    expect(rigidTestSpawnCenterY()).toBe(3.05);
  });

  it('uses camera target for horizontal spawn', () => {
    const pos = rigidTestSpawnPosition({ x: 1.5, y: 0.4, z: -2 });
    expect(pos).toEqual({ x: 1.5, y: 3.05, z: -2 });
  });

  it('returns a unit quaternion for random spawn rotation', () => {
    const q = rigidTestRandomSpawnRotation();
    const len = Math.hypot(q.x, q.y, q.z, q.w);
    expect(len).toBeCloseTo(1, 5);
  });
});
