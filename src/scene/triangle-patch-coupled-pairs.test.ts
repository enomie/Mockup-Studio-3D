import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import type { PatchParams, PatchPoint } from './asset-triangle-patch';
import type { AssetEntity, EntityTransform, Vec3 } from './entity-types';
import {
  alignSharedPairAverage,
  applyInnerPinkCoupling,
  averageOpposite,
  pairOfHandle,
} from './triangle-patch-coupled-pairs';
import { propagateEdgeLinks, type PatchEdgeLink } from './triangle-patch-edge-link';

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
const add = (a: Vec3, b: Vec3): Vec3 => v(a.x + b.x, a.y + b.y, a.z + b.z);
const off = (p: PatchPoint, k: 'handleNext' | 'handlePrev' | 'handleCrossIn') => new Vector3(p[k].x - p.pos.x, p[k].y - p.pos.y, p[k].z - p.pos.z);
const identity: EntityTransform = { position: v(0, 0, 0), rotation: v(0, 0, 0) };

/** Triangle c0 -> m -> c1 -> c2; edge c0..c1 (with inner point m) is shared. */
function triangle(prefix: string, c: [Vec3, Vec3, Vec3], yellow: Vec3[]): PatchParams {
  const ids = [`${prefix}c0`, `${prefix}m`, `${prefix}c1`, `${prefix}c2`];
  const pos = [c[0], lerp(c[0], c[1], 0.5), c[1], c[2]];
  const points: PatchPoint[] = ids.map((id, i) => ({
    id,
    name: id,
    pos: pos[i],
    handleNext: lerp(pos[i], pos[(i + 1) % 4], 1 / 3),
    handlePrev: lerp(pos[i], pos[(i + 3) % 4], 1 / 3),
    handleCrossIn: add(pos[i], yellow[i]),
    handleCrossOut: pos[i],
  }));
  return { divisions: 24, points, cornerIds: [ids[0], ids[2], ids[3]], edgeParams: { [ids[1]]: 0.5 } };
}

function pair() {
  const a = triangle('a', [v(0, 0, 0), v(1, 0, 0), v(0.5, 1, 0.3)], [v(0, 0.2, 0.3), v(0.1, 0.3, 0.1), v(0, 0.1, 0.2), v(0, 0, 0)]);
  const b = triangle('b', [v(1, 0, 0), v(0, 0, 0), v(0.9, -2.5, 0.8)], [v(0, 0.1, 0.4), v(0, -0.2, 0.3), v(0, -0.3, -0.1), v(0, 0, 0)]);
  const link = (s: string, e: string, ps: string, pe: string, partner: string): PatchEdgeLink =>
    ({ startPointId: s, endPointId: e, partnerEntityId: partner, partnerStartPointId: ps, partnerEndPointId: pe });
  a.edgeLinks = [link('ac0', 'am', 'bc1', 'bm', 'B'), link('am', 'ac1', 'bm', 'bc0', 'B')];
  b.edgeLinks = [link('bc1', 'bm', 'ac0', 'am', 'A'), link('bm', 'bc0', 'am', 'ac1', 'A')];
  const mk = (id: string, params: PatchParams): AssetEntity =>
    ({ id, type: 'asset', name: id, assetKind: 'triangle-patch', screenImageId: null, sizeScale: 1, visible: true, transform: identity, patchParams: params });
  const map = new Map([['A', mk('A', a)], ['B', mk('B', b)]]);
  const find = (id: string) => map.get(id);
  const apply = (updates: Map<string, PatchPoint[]>) => {
    for (const [id, points] of updates) {
      const e = map.get(id);
      if (e?.patchParams) {map.set(id, { ...e, patchParams: { ...e.patchParams, points } });}
    }
  };
  const pt = (id: string, pid: string): PatchPoint => {
    const found = map.get(id)?.patchParams?.points.find((p) => p.id === pid);
    if (!found) {throw new Error(`missing point ${pid}`);}
    return found;
  };
  return { find, apply, pt };
}

const acrossX = (w: Vector3) => new Vector3(0, w.y, w.z);

describe('averageOpposite', () => {
  it('puts both opposite on the average direction, keeps lengths and is symmetric', () => {
    const a = new Vector3(0, 2, 0);
    const b = new Vector3(0, 0, 3);
    const [a1, b1] = averageOpposite(a, b);
    expect(a1.length()).toBeCloseTo(2, 12);
    expect(b1.length()).toBeCloseTo(3, 12);
    expect(a1.clone().normalize().dot(b1.clone().normalize())).toBeCloseTo(-1, 12);
    const [b2, a2] = averageOpposite(b, a);
    expect(a2.distanceTo(a1)).toBeLessThan(1e-12);
    expect(b2.distanceTo(b1)).toBeLessThan(1e-12);
  });

  it('with an axis: only the part across the axis is turned', () => {
    const axis = new Vector3(1, 0, 0);
    const [a1, b1] = averageOpposite(new Vector3(0.5, 1, 0), new Vector3(-0.2, 1, 0), axis);
    expect(a1.x).toBeCloseTo(0.5, 12);
    expect(b1.x).toBeCloseTo(-0.2, 12);
    expect(acrossX(a1).normalize().dot(acrossX(b1).normalize())).toBeCloseTo(-1, 12);
  });
});

describe('coupled pairs on a shared edge', () => {
  it('yellow pair: align average puts both yellow handles opposite across the edge and couples them', () => {
    const s = pair();
    s.apply(alignSharedPairAverage('A', 'ac0', 'yellow', s.find));
    const a = off(s.pt('A', 'ac0'), 'handleCrossIn');
    const b = off(s.pt('B', 'bc1'), 'handleCrossIn');
    expect(acrossX(a).normalize().dot(acrossX(b).normalize())).toBeCloseTo(-1, 9);
    expect(s.pt('A', 'ac0').joint).toBe('smooth');
    expect(s.pt('B', 'bc1').joint).toBe('smooth');
  });

  it('pink pair at an end point: neighboring-edge pinks opposite across the edge', () => {
    const s = pair();
    s.apply(alignSharedPairAverage('A', 'ac0', 'pink', s.find));
    // ac0: neighboring edge pink = handlePrev (towards ac2); bc1: neighboring edge pink = handleNext (towards bc2).
    const a = off(s.pt('A', 'ac0'), 'handlePrev');
    const b = off(s.pt('B', 'bc1'), 'handleNext');
    expect(acrossX(a).normalize().dot(acrossX(b).normalize())).toBeCloseTo(-1, 9);
    expect(s.pt('A', 'ac0').pinkPair).toBe('coupled');
    expect(s.pt('B', 'bc1').pinkPair).toBe('coupled');
  });

  it('pink pair at an inner point: forward and backward pink on one line', () => {
    const s = pair();
    s.apply(alignSharedPairAverage('A', 'am', 'pink', s.find));
    const n = off(s.pt('A', 'am'), 'handleNext');
    const p = off(s.pt('A', 'am'), 'handlePrev');
    expect(n.clone().normalize().dot(p.clone().normalize())).toBeCloseTo(-1, 12);
  });

  it('coupled pairs follow edits through the link sync, lengths stay', () => {
    const s = pair();
    s.apply(alignSharedPairAverage('A', 'ac0', 'yellow', s.find));
    s.apply(alignSharedPairAverage('A', 'ac0', 'pink', s.find));
    const lenB = off(s.pt('B', 'bc1'), 'handleNext').length();
    // Turn A's neighboring-edge pink at ac0 upwards.
    const p = s.pt('A', 'ac0');
    const A = s.find('A')!;
    const edited = { ...p, handlePrev: add(p.pos, v(0.1, 0.2, 0.4)) };
    s.apply(new Map([['A', (A.patchParams!).points.map((q) => (q.id === p.id ? edited : q))]]));
    s.apply(propagateEdgeLinks(['A'], s.find));
    const a = off(s.pt('A', 'ac0'), 'handlePrev');
    const b = off(s.pt('B', 'bc1'), 'handleNext');
    expect(acrossX(a).normalize().dot(acrossX(b).normalize())).toBeCloseTo(-1, 9);
    expect(b.length()).toBeCloseTo(lenB, 1); // across length kept; along part unchanged
  });

  it('inner pink coupling turns the other pink handle along (lengths stay)', () => {
    const s = pair();
    s.apply(alignSharedPairAverage('A', 'am', 'pink', s.find));
    const params = (s.find('A')!).patchParams!;
    const p = s.pt('A', 'am');
    const lenPrev = off(p, 'handlePrev').length();
    const moved = applyInnerPinkCoupling(params, { ...p, handleNext: add(p.pos, v(0.1, 0.1, 0.1)) }, 'handleNext');
    expect(off(moved, 'handlePrev').length()).toBeCloseTo(lenPrev, 12);
    expect(off(moved, 'handlePrev').normalize().dot(off(moved, 'handleNext').normalize())).toBeCloseTo(-1, 12);
    // Free pair: no turning.
    const free = { ...p, pinkPair: 'free' as const, handleNext: add(p.pos, v(0.1, 0.1, 0.1)) };
    expect(applyInnerPinkCoupling(params, free, 'handleNext')).toBe(free);
  });

  it('knows which pair a dragged handle belongs to (for Shift)', () => {
    const s = pair();
    const params = (s.find('A')!).patchParams!;
    expect(pairOfHandle(params, 'ac0', 'handleCrossIn')).toBe('yellow');
    expect(pairOfHandle(params, 'ac0', 'handlePrev')).toBe('pink'); // neighboring edge
    expect(pairOfHandle(params, 'ac0', 'handleNext')).toBeNull(); // along the shared edge
    expect(pairOfHandle(params, 'am', 'handleNext')).toBe('pink');
    expect(pairOfHandle(params, 'ac2', 'handleNext')).toBeNull(); // not on the shared edge
  });
});
