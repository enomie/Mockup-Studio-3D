import { describe, expect, it } from 'vitest';
import {
  clampGravityScale,
  DEFAULT_GRAVITY_SCALE,
  gravityVectorFromScale,
  GRAVITY_SCALE_MAX,
  GRAVITY_SCALE_MIN,
  STANDARD_GRAVITY_Y,
} from './physics-settings';

describe('clampGravityScale', () => {
  it('clamps to 0.01–2', () => {
    expect(clampGravityScale(-1)).toBe(GRAVITY_SCALE_MIN);
    expect(clampGravityScale(0)).toBe(GRAVITY_SCALE_MIN);
    expect(clampGravityScale(3)).toBe(GRAVITY_SCALE_MAX);
    expect(clampGravityScale(1)).toBe(1);
  });
});

describe('gravityVectorFromScale', () => {
  it('uses earth gravity at scale 1', () => {
    const g = gravityVectorFromScale(DEFAULT_GRAVITY_SCALE);
    expect(g.x).toBe(0);
    expect(g.z).toBe(0);
    expect(g.y).toBeCloseTo(STANDARD_GRAVITY_Y);
  });

  it('clamps sub-minimum scale before applying gravity', () => {
    expect(gravityVectorFromScale(0).y).toBeCloseTo(STANDARD_GRAVITY_Y * GRAVITY_SCALE_MIN);
  });
});
