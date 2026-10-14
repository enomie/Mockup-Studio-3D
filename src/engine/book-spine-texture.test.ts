import { describe, expect, it } from 'vitest';
import { computeSpineContainTopUv } from '@/engine/book-spine-texture';

describe('computeSpineContainTopUv', () => {
  it('fits wide image to plane width without exceeding U', () => {
    const uv = computeSpineContainTopUv(0.03, 0.2, 400, 100);
    expect(uv.repeatU).toBe(1);
    expect(uv.repeatV).toBeLessThanOrEqual(1);
    expect(uv.offsetV).toBeGreaterThan(0);
  });

  it('centers narrow image horizontally', () => {
    const uv = computeSpineContainTopUv(0.05, 0.2, 50, 400);
    expect(uv.repeatV).toBe(1);
    expect(uv.repeatU).toBeLessThan(1);
    expect(uv.offsetU).toBeGreaterThan(0);
  });
});
