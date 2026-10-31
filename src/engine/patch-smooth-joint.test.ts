import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three/webgpu';
import type { PatchJoint, PatchParams, PatchPoint } from '@/scene/asset-triangle-patch';
import type { AssetEntity, EntityTransform, Vec3 } from '@/scene/entity-types';
import {
  captureEdgeShape,
  crossHandleKeyAt,
  propagateEdgeLinks,
  type PatchEdgeLink,
} from '@/scene/triangle-patch-edge-link';
import {
  evalEdgeCorrectedSurface,
  prepareEdgeCorrection,
  triangleEdgeCoordinates,
} from './patch-edge-correction';
import { evalPatchSurfacePoint } from './triangle-patch-geometry';

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
const add = (a: Vec3, b: Vec3): Vec3 => v(a.x + b.x, a.y + b.y, a.z + b.z);
const identity: EntityTransform = { position: v(0, 0, 0), rotation: v(0, 0, 0) };

/** Straight-edged classic triangle; edge 0 (c0 -> c1) has an edge point m in the middle. */
function triangle(prefix: string, c: [Vec3, Vec3, Vec3], middleCross: Vec3, joint: PatchJoint): PatchParams {
  const ids = [`${prefix}c0`, `${prefix}m`, `${prefix}c1`, `${prefix}c2`];
  const pos = [c[0], lerp(c[0], c[1], 0.5), c[1], c[2]];
  const cross = [v(0, 0.05, 0), middleCross, v(0, 0.05, 0), v(0, 0.05, 0)];
  const points: PatchPoint[] = ids.map((id, i) => ({
    id,
    name: id,
    pos: pos[i],
    handleNext: lerp(pos[i], pos[(i + 1) % 4], 1 / 3),
    handlePrev: lerp(pos[i], pos[(i + 3) % 4], 1 / 3),
    handleCrossIn: add(pos[i], cross[i]),
    handleCrossOut: add(pos[i], v(-cross[i].x, -cross[i].y, -cross[i].z)),
    ...(i < 3 ? { joint } : {}),
  }));
  return {
    divisions: 24,
    points,
    cornerIds: [ids[0], ids[2], ids[3]],
    edgeParams: { [ids[1]]: 0.5 },
  };
}

function entity(id: string, params: PatchParams, transform = identity): AssetEntity {
  return { id, type: 'asset', name: id, assetKind: 'triangle-patch', screenImageId: null, sizeScale: 1, visible: true, transform, patchParams: params };
}

/**
 * A (small) and B (large, skewed) share the edge (0,0,0)-(1,0,0); B runs it reversed.
 * The third corners are lifted differently, so the neighbor edges are NOT in one plane.
 */
function linkedPair(joint: PatchJoint) {
  const a = triangle('a', [v(0, 0, 0), v(1, 0, 0), v(0.5, 1, 0.3)], v(0, 0.2, 0.2), joint);
  const b = triangle('b', [v(1, 0, 0), v(0, 0, 0), v(0.9, -2.5, 0.8)], v(0, -0.3, 0.05), joint);
  const link = (s: string, e: string, ps: string, pe: string, partner: string): PatchEdgeLink =>
    ({ startPointId: s, endPointId: e, partnerEntityId: partner, partnerStartPointId: ps, partnerEndPointId: pe });
  a.edgeLinks = [link('ac0', 'am', 'bc1', 'bm', 'B'), link('am', 'ac1', 'bm', 'bc0', 'B')];
  b.edgeLinks = [link('bc1', 'bm', 'ac0', 'am', 'A'), link('bm', 'bc0', 'am', 'ac1', 'A')];
  return { A: entity('A', a), B: entity('B', b) };
}

function settle(A: AssetEntity, B: AssetEntity, source: 'A' | 'B') {
  const map = new Map([[A.id, A], [B.id, B]]);
  const updates = propagateEdgeLinks([source], (id) => map.get(id));
  for (const [id, points] of updates) {
    const e = map.get(id);
    if (e?.patchParams) {map.set(id, { ...e, patchParams: { ...e.patchParams, points } });}
  }
  return { A: map.get('A')!, B: map.get('B')!, changed: updates.size };
}

function edgeNormal(params: PatchParams, t: number): Vector3 {
  // Rendered surface: classic plus the linked-edge correction (none for corner joints).
  const prepared = prepareEdgeCorrection(params);
  const at = (u: number, w: number, out = new Vector3()) => (prepared
    ? evalEdgeCorrectedSurface(prepared, triangleEdgeCoordinates(u, 1 - u - w, w), out)
    : evalPatchSurfacePoint(params, u, 1 - u - w, w, out));
  const h = 1e-6;
  const p = at(1 - t, 0);
  const along = at(1 - t - h, 0).sub(p);
  const inward = at((1 - t) * (1 - h), h).sub(p);
  return along.cross(inward).normalize();
}

function maxKinkDeg(A: AssetEntity, B: AssetEntity): number {
  let worst = 0;
  for (const t of [0.02, 0.05, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 0.95, 0.98]) {
    const dot = Math.abs(edgeNormal(A.patchParams!, t).dot(edgeNormal(B.patchParams!, 1 - t)));
    worst = Math.max(worst, (Math.acos(Math.min(1, dot)) * 180) / Math.PI);
  }
  return worst;
}

const point = (e: AssetEntity, id: string) => (e.patchParams!).points.find((p) => p.id === id)!;

describe('smooth joints on linked patches', () => {
  it('removes the crease along the whole shared edge, corners included', () => {
    const before = linkedPair('corner');
    const creaseCorner = maxKinkDeg(before.A, before.B);
    const { A, B } = settle(...Object.values(linkedPair('smooth')) as [AssetEntity, AssetEntity], 'A');
    const creaseSmooth = maxKinkDeg(A, B);
    expect(creaseCorner).toBeGreaterThan(10);
    expect(creaseSmooth).toBeLessThan(0.1);
  });

  it('turns the partner edge-point handle opposite and keeps its length', () => {
    const pair = linkedPair('smooth');
    const lenBefore = (() => {
      const p = point(pair.B, 'bm');
      return Math.hypot(p.handleCrossIn.y - p.pos.y, p.handleCrossIn.z - p.pos.z);
    })();
    const { B } = settle(pair.A, pair.B, 'A');
    const q = point(B, 'bm');
    const d = v(q.handleCrossIn.x - q.pos.x, q.handleCrossIn.y - q.pos.y, q.handleCrossIn.z - q.pos.z);
    // A's handle is (0, 0.2, 0.2): perpendicular to the x-axis edge, so B's must be -(0,1,1)/sqrt2 * length.
    expect(Math.hypot(d.y, d.z)).toBeCloseTo(lenBefore, 9);
    expect(d.y).toBeCloseTo(-lenBefore / Math.SQRT2, 9);
    expect(d.z).toBeCloseTo(-lenBefore / Math.SQRT2, 9);
  });

  it('leaves corner joints alone', () => {
    const pair = linkedPair('corner');
    const { B } = settle(pair.A, pair.B, 'A');
    expect(point(B, 'bm').handleCrossIn).toEqual(point(pair.B, 'bm').handleCrossIn);
    expect(point(B, 'bc0').handleNext).toEqual(point(pair.B, 'bc0').handleNext);
  });

  it('is idempotent in both directions', () => {
    const first = settle(...Object.values(linkedPair('smooth')) as [AssetEntity, AssetEntity], 'A');
    expect(settle(first.A, first.B, 'A').changed).toBe(0);
    expect(settle(first.A, first.B, 'B').changed).toBe(0);
  });

  it('copies the joint state to the partner', () => {
    const pair = linkedPair('corner');
    const a = pair.A.patchParams!;
    const A = { ...pair.A, patchParams: { ...a, points: a.points.map((p) => (p.id === 'am' ? { ...p, joint: 'smooth' as const } : p)) } };
    const { B } = settle(A, pair.B, 'A');
    expect(point(B, 'bm').joint).toBe('smooth');
    expect(point(B, 'bc0').joint).toBe('corner');
  });

  it('keeps both links to the same partner in sync (both segments of a split edge)', () => {
    const pair = linkedPair('corner');
    const a = pair.A.patchParams!;
    // Turn the edge point's pink handles: both segments change.
    const A = {
      ...pair.A,
      patchParams: {
        ...a,
        points: a.points.map((p) => (p.id === 'am' ? { ...p, handleNext: add(p.handleNext, v(0, 0, 0.1)), handlePrev: add(p.handlePrev, v(0, 0, -0.1)) } : p)),
      },
    };
    const { B } = settle(A, pair.B, 'A');
    const segA1 = captureEdgeShape(A.patchParams, A.transform, { startPointId: 'ac0', endPointId: 'am' });
    const segB1 = captureEdgeShape(B.patchParams!, B.transform, { startPointId: 'bc1', endPointId: 'bm' });
    const segA2 = captureEdgeShape(A.patchParams, A.transform, { startPointId: 'am', endPointId: 'ac1' });
    const segB2 = captureEdgeShape(B.patchParams!, B.transform, { startPointId: 'bm', endPointId: 'bc0' });
    expect(segB1?.endHandle.z).toBeCloseTo(segA1?.endHandle.z ?? NaN, 9);
    expect(segB2?.startHandle.z).toBeCloseTo(segA2?.startHandle.z ?? NaN, 9);
  });

  it('does not couple star points (corner shared by two edges)', () => {
    const params = linkedPair('smooth').A.patchParams!;
    expect(crossHandleKeyAt(params, 'ac0', { startPointId: 'ac0', endPointId: 'am' }, 2)).toBeNull();
    expect(crossHandleKeyAt(params, 'ac0', { startPointId: 'ac0', endPointId: 'am' }, 1)).toBe('handlePrev');
    expect(crossHandleKeyAt(params, 'am', { startPointId: 'ac0', endPointId: 'am' }, 2)).toBe('handleCrossIn');
  });
});
