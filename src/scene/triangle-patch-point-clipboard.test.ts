import { describe, expect, it } from 'vitest';
import type { PatchPoint } from './asset-triangle-patch';
import type { EntityTransform } from './entity-types';
import { copyPatchPoint, pastePatchPoint } from './triangle-patch-point-clipboard';

const identity: EntityTransform = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };

function point(id: string, x: number, y: number, z: number): PatchPoint {
  return {
    id,
    name: id,
    pos: { x, y, z },
    handleNext: { x: x + 1, y, z },
    handlePrev: { x: x - 1, y, z },
    handleCrossIn: { x, y: y + 0.5, z },
    handleCrossOut: { x, y: y - 0.5, z },
  };
}

function expectVec(actual: { x: number; y: number; z: number }, expected: { x: number; y: number; z: number }) {
  expect(actual.x).toBeCloseTo(expected.x, 9);
  expect(actual.y).toBeCloseTo(expected.y, 9);
  expect(actual.z).toBeCloseTo(expected.z, 9);
}

describe('patch point clipboard', () => {
  it('copies position and handles 1:1 between untransformed patches', () => {
    const src = point('a', 1, 2, 3);
    src.handleNext = { x: 1.3, y: 2.4, z: 3 };
    const clip = copyPatchPoint(src, identity, { entityId: 'e1', label: 'P1' });
    const result = pastePatchPoint(point('b', 9, 9, 9), identity, clip);
    expect(result.id).toBe('b');
    expect(result.name).toBe('b');
    expectVec(result.pos, src.pos);
    expectVec(result.handleNext, src.handleNext);
    expectVec(result.handleCrossOut, src.handleCrossOut);
  });

  it('keeps the world position when source and target patches are transformed differently', () => {
    const srcTransform: EntityTransform = { position: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 } };
    const dstTransform: EntityTransform = { position: { x: 0, y: 2, z: -1 }, rotation: { x: 0.3, y: 0, z: -0.7 } };
    const src = point('a', 1, 0, 0);
    const clip = copyPatchPoint(src, srcTransform, { entityId: 'e1', label: 'P1' });
    // Y rotation by 90° maps local +X to world -Z, then translate by +1 X.
    expectVec(clip.pos, { x: 1, y: 0, z: -1 });
    expectVec(clip.handleOffsets.handleNext, { x: 0, y: 0, z: -1 });

    const pasted = pastePatchPoint(point('b', 0, 0, 0), dstTransform, clip);
    const back = copyPatchPoint(pasted, dstTransform, { entityId: 'e2', label: 'P2' });
    expectVec(back.pos, clip.pos);
    expectVec(back.handleOffsets.handleNext, clip.handleOffsets.handleNext);
    expectVec(back.handleOffsets.handleCrossIn, clip.handleOffsets.handleCrossIn);
  });

  it('position mode moves the anchor and carries the target handles along', () => {
    const clip = copyPatchPoint(point('a', 5, 5, 5), identity, { entityId: 'e1', label: 'P1' });
    const target = point('b', 0, 0, 0);
    target.handleNext = { x: 0, y: 0, z: 2 };
    const result = pastePatchPoint(target, identity, clip, 'position');
    expectVec(result.pos, { x: 5, y: 5, z: 5 });
    expectVec(result.handleNext, { x: 5, y: 5, z: 7 });
  });

  it('handles mode keeps the anchor and applies the copied offsets', () => {
    const src = point('a', 5, 5, 5);
    src.handleCrossIn = { x: 5, y: 5, z: 8 };
    const clip = copyPatchPoint(src, identity, { entityId: 'e1', label: 'P1' });
    const result = pastePatchPoint(point('b', 1, 1, 1), identity, clip, 'handles');
    expectVec(result.pos, { x: 1, y: 1, z: 1 });
    expectVec(result.handleCrossIn, { x: 1, y: 1, z: 4 });
  });
});
