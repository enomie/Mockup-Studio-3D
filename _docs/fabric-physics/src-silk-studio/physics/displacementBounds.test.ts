import { describe, expect, it } from 'vitest';
import { clampDisplacementFromPrev } from './displacementBounds.ts';

describe('clampDisplacementFromPrev', () => {
  it('shortens displacement when it exceeds the bound', () => {
    const xPrev = new Float32Array([0, 0, 0]);
    const pos = new Float32Array([3, 0, 0]);
    clampDisplacementFromPrev(pos, 0, xPrev, 1);
    expect(pos[0]).toBeCloseTo(1, 5);
    expect(pos[1]).toBe(0);
    expect(pos[2]).toBe(0);
  });

  it('leaves position unchanged when within bound', () => {
    const xPrev = new Float32Array([0, 0, 0]);
    const pos = new Float32Array([0.2, 0, 0]);
    clampDisplacementFromPrev(pos, 0, xPrev, 1);
    expect(pos[0]).toBeCloseTo(0.2, 5);
  });
});
