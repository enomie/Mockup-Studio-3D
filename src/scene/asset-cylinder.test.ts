import { describe, expect, it } from 'vitest';
import { clampCylinderParams, defaultCylinderParams } from './asset-cylinder';

describe('asset-cylinder', () => {
  it('clamps corner radius to radius and half height', () => {
    const base = defaultCylinderParams();
    const clamped = clampCylinderParams({ cornerRadiusMm: 9999 }, base);
    expect(clamped.cornerRadiusMm).toBeLessThanOrEqual(150);
  });
});
