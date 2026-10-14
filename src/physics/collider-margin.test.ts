import { describe, expect, it } from 'vitest';
import { PHYSICS_COLLIDER_MARGIN_M } from './constants';
import { inflateHalfExtentsForPhysics } from './collider-margin';

describe('inflateHalfExtentsForPhysics', () => {
  it('adds margin on each axis', () => {
    const half = inflateHalfExtentsForPhysics({ x: 0.15, y: 0.15, z: 0.15 });
    expect(half).toEqual({
      x: 0.15 + PHYSICS_COLLIDER_MARGIN_M,
      y: 0.15 + PHYSICS_COLLIDER_MARGIN_M,
      z: 0.15 + PHYSICS_COLLIDER_MARGIN_M,
    });
  });
});
