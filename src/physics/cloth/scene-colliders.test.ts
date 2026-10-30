import { describe, expect, it } from 'vitest';
import { resolveSceneCollisions } from '@/physics/cloth/scene-colliders';

describe('resolveSceneCollisions floor friction', () => {
  it('never moves a floor particle farther than its incoming velocity', () => {
    const px = 0;
    const vx = 0.01;
    for (const friction of [0, 0.3, 1]) {
      const r = resolveSceneCollisions(px + vx, -0.01, 0, vx, -0.01, 0, { colliders: [] }, 0, 0, friction);
      expect(r.x - px).toBeCloseTo(vx * (1 - friction), 10);
    }
  });

  it('does not accelerate a sliding particle over many steps', () => {
    let x = 0;
    let oldX = -0.01;
    for (let i = 0; i < 100; i++) {
      const vx = x - oldX;
      oldX = x;
      x = resolveSceneCollisions(x + vx, -0.01, 0, vx, 0, 0, { colliders: [] }, 0, 0, 0.2).x;
    }
    expect(x - oldX).toBeLessThan(0.01);
  });
});
