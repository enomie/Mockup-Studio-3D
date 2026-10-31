import { describe, expect, it } from 'vitest';
import { defaultPatchParamsForKind, type PatchPoint } from './asset-triangle-patch';
import type { AssetEntity, Vec3 } from './entity-types';
import { propagateEdgeLinks, type PatchEdgeLink } from './triangle-patch-edge-link';
import { applyEdgeTangentRule, resolveEdgeTangent } from './triangle-patch-node-edit';
import { copyPatchPoint, pastePatchPoint } from './triangle-patch-point-clipboard';
import { insertPatchPoint } from './triangle-patch-point-edit';

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const len = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function point(next: Vec3, prev: Vec3, edgeTangent?: 'smooth' | 'corner'): PatchPoint {
  return {
    id: 'p',
    name: 'p',
    pos: v(0, 0, 0),
    handleNext: next,
    handlePrev: prev,
    handleCrossIn: v(0, 0.3, 0),
    handleCrossOut: v(0, -0.2, 0),
    ...(edgeTangent ? { edgeTangent } : {}),
  };
}

describe('edge switch (pink handles)', () => {
  it('derives smooth for (almost) straight handles and corner otherwise', () => {
    expect(resolveEdgeTangent(point(v(1, 0, 0), v(-2, 0, 0)))).toBe('smooth');
    expect(resolveEdgeTangent(point(v(1, 0, 0), v(-2, 0.02, 0)))).toBe('smooth'); // ~0.6 deg
    expect(resolveEdgeTangent(point(v(1, 0, 0), v(-2, 0.1, 0)))).toBe('corner'); // ~2.9 deg
    expect(resolveEdgeTangent(point(v(1, 0, 0), v(0, 0, 0)))).toBe('corner'); // retracted
    expect(resolveEdgeTangent(point(v(1, 0, 0), v(0, 1, 0), 'smooth'))).toBe('smooth'); // stored wins
  });

  it('smooth: moving one pink handle turns the other opposite and keeps its length', () => {
    const p = point(v(0, 0.5, 0.5), v(-2, 0, 0), 'smooth');
    const next = applyEdgeTangentRule(p, 'handleNext');
    expect(len(next.handlePrev, next.pos)).toBeCloseTo(2, 12);
    const dir = Math.SQRT1_2;
    expect(next.handlePrev.y).toBeCloseTo(-2 * dir, 12);
    expect(next.handlePrev.z).toBeCloseTo(-2 * dir, 12);
    const back = applyEdgeTangentRule({ ...next, handlePrev: v(0, 0, -1) }, 'handlePrev');
    expect(back.handleNext.z).toBeCloseTo(len(next.handleNext, next.pos), 12);
  });

  it('corner: pink handles stay independent', () => {
    const p = point(v(0, 1, 0), v(-2, 0, 0), 'corner');
    expect(applyEdgeTangentRule(p, 'handleNext')).toBe(p);
  });

  it('yellow handles are not coupled (no seesaw)', () => {
    const p = point(v(1, 0, 0), v(-1, 0, 0), 'smooth');
    const moved = { ...p, handleCrossIn: v(0.4, 0.4, 0) };
    expect(applyEdgeTangentRule(moved, 'handleCrossIn').handleCrossOut).toEqual(p.handleCrossOut);
  });

  it('inserted points start smooth without changing the edge', () => {
    const { params, pointId } = insertPatchPoint(defaultPatchParamsForKind('triangle-patch'), 0, 0.4);
    const inserted = params.points.find((pt) => pt.id === pointId)!;
    expect(inserted.edgeTangent).toBe('smooth');
    expect(resolveEdgeTangent({ ...inserted, edgeTangent: undefined })).toBe('smooth');
  });

  it('pasting handles re-derives the edge switch from the new handles', () => {
    const identity = { position: v(0, 0, 0), rotation: v(0, 0, 0) };
    const kinked = point(v(1, 0, 0), v(0, 1, 0));
    const clip = copyPatchPoint(kinked, identity, { entityId: 'e', label: 'x' });
    const pasted = pastePatchPoint(point(v(1, 0, 0), v(-1, 0, 0), 'smooth'), identity, clip, 'handles');
    expect(resolveEdgeTangent(pasted)).toBe('corner');
  });

  it('copies the edge switch to the linked partner', () => {
    const base = defaultPatchParamsForKind('triangle-patch');
    const [p0, p1] = base.points;
    const link = (partner: string): PatchEdgeLink => ({
      startPointId: p0.id, endPointId: p1.id, partnerEntityId: partner, partnerStartPointId: p0.id, partnerEndPointId: p1.id,
    });
    const mk = (id: string, partner: string, tangent?: 'smooth' | 'corner'): AssetEntity => ({
      id, type: 'asset', name: id, assetKind: 'triangle-patch', screenImageId: null, sizeScale: 1, visible: true,
      transform: { position: v(0, 0, 0), rotation: v(0, 0, 0) },
      patchParams: {
        ...base,
        points: base.points.map((pt) => (pt.id === p0.id && tangent ? { ...pt, edgeTangent: tangent } : pt)),
        edgeLinks: [link(partner)],
      },
    });
    const A = mk('A', 'B', 'corner');
    const B = mk('B', 'A');
    const out = propagateEdgeLinks(['A'], (id) => (id === 'A' ? A : B)).get('B');
    expect(out?.find((pt) => pt.id === p0.id)?.edgeTangent).toBe('corner');
  });
});
