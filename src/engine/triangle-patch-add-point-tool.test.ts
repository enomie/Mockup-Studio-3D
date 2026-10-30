import { describe, expect, it } from 'vitest';
import { Vector2 } from 'three/webgpu';
import { findClosestEdgeHit } from './triangle-patch-add-point-tool';

const horizontal = [new Vector2(0, 0), new Vector2(50, 0), new Vector2(100, 0)];
const vertical = [new Vector2(200, 0), new Vector2(200, 100)];

describe('findClosestEdgeHit', () => {
  it('returns the edge and parameter under the pointer', () => {
    const hit = findClosestEdgeHit([horizontal, vertical], new Vector2(75, 5), 10);
    expect(hit?.edgeIndex).toBe(0);
    expect(hit?.t).toBeCloseTo(0.75);
  });

  it('picks the closer of two edges', () => {
    const hit = findClosestEdgeHit([horizontal, vertical], new Vector2(196, 40), 10);
    expect(hit?.edgeIndex).toBe(1);
    expect(hit?.t).toBeCloseTo(0.4);
  });

  it('returns null outside the hover radius', () => {
    expect(findClosestEdgeHit([horizontal, vertical], new Vector2(50, 30), 10)).toBeNull();
  });

  it('skips samples behind the camera', () => {
    const clipped = [new Vector2(0, 0), null, new Vector2(100, 0)];
    expect(findClosestEdgeHit([clipped], new Vector2(50, 0), 10)).toBeNull();
  });
});
