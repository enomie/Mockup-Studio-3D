import { describe, expect, it } from 'vitest';
import type { PatchPoint } from './asset-triangle-patch';
import { deriveHandleDirection, handleTipAt, unitDir } from './triangle-patch-handle-length';

const v = (x: number, y: number, z: number) => ({ x, y, z });
const pt = (id: string, pos: ReturnType<typeof v>, h: Partial<PatchPoint> = {}): PatchPoint => ({
  id, name: id, pos,
  handleNext: pos, handlePrev: pos, handleCrossIn: pos, handleCrossOut: pos,
  ...h,
});

describe('deriveHandleDirection', () => {
  it('mirrors the opposite handle', () => {
    const points = [pt('a', v(0, 0, 0), { handlePrev: v(-2, 0, 0) }), pt('b', v(0, 5, 0))];
    expect(deriveHandleDirection(points, 'a', 'handleNext')).toEqual(v(1, 0, 0));
  });

  it('falls back to the edge towards the neighbor', () => {
    const points = [pt('a', v(0, 0, 0)), pt('b', v(0, 3, 0)), pt('c', v(0, 0, 4))];
    expect(deriveHandleDirection(points, 'a', 'handleNext')).toEqual(v(0, 1, 0));
    expect(deriveHandleDirection(points, 'a', 'handlePrev')).toEqual(v(0, 0, 1));
  });

  it('mirrors cross handles, but has no edge fallback for them', () => {
    const points = [pt('a', v(0, 0, 0), { handleCrossIn: v(0, 0, -1) }), pt('b', v(1, 0, 0))];
    expect(deriveHandleDirection(points, 'a', 'handleCrossOut')).toEqual(v(0, 0, 1));
    expect(deriveHandleDirection(points, 'a', 'handleCrossIn')).toBeNull();
  });

  it('returns null for an isolated point', () => {
    expect(deriveHandleDirection([pt('a', v(0, 0, 0))], 'a', 'handleNext')).toBeNull();
  });
});

describe('helpers', () => {
  it('unitDir is null for coincident points', () => {
    expect(unitDir(v(1, 1, 1), v(1, 1, 1))).toBeNull();
  });
  it('handleTipAt places the tip at the given length', () => {
    expect(handleTipAt(v(1, 0, 0), v(0, 1, 0), 0.2)).toEqual(v(1, 0.2, 0));
  });
});
