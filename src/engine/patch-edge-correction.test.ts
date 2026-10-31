import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three/webgpu';
import {
  defaultPatchParamsForKind,
  type PatchJoint,
  type PatchParams,
  type PatchPoint,
} from '@/scene/asset-triangle-patch';
import type { Vec3 } from '@/scene/entity-types';
import type { PatchEdgeLink } from '@/scene/triangle-patch-edge-link';
import { averageOpposite } from '@/scene/patch-nodes';
import { buildTrianglePatchGeometry, evalEdge, evalPatchSurfacePoint } from './triangle-patch-geometry';
import { evalQuadPatchSurfacePoint } from './quad-patch-geometry';
import {
  applyEdgeCorrectionToGeometry,
  evalEdgeCorrectedSurface,
  prepareEdgeCorrection,
  quadEdgeCoordinates,
  triangleEdgeCoordinates,
} from './patch-edge-correction';

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
const add = (a: Vec3, b: Vec3): Vec3 => v(a.x + b.x, a.y + b.y, a.z + b.z);

/** Classic triangle with straight edges; edge 0 (c0 -> c1) has an edge point in the middle. */
function triangle(prefix: string, c: [Vec3, Vec3, Vec3], middleCross: Vec3, cornerLift: number, joint: PatchJoint): PatchParams {
  const ids = [`${prefix}c0`, `${prefix}m`, `${prefix}c1`, `${prefix}c2`];
  const pos = [c[0], lerp(c[0], c[1], 0.5), c[1], c[2]];
  const cross = [v(0, cornerLift, 0), middleCross, v(0, cornerLift, 0), v(0, cornerLift, 0)];
  const points: PatchPoint[] = ids.map((id, i) => ({
    id,
    name: id,
    pos: pos[i],
    handleNext: lerp(pos[i], pos[(i + 1) % 4], 1 / 3),
    handlePrev: lerp(pos[i], pos[(i + 3) % 4], 1 / 3),
    handleCrossIn: add(pos[i], cross[i]),
    handleCrossOut: add(pos[i], v(-cross[i].x, -cross[i].y, -cross[i].z)),
    ...(i < 3 ? { joint, pinkPair: joint === 'smooth' ? 'coupled' as const : 'free' as const } : {}),
  }));
  return { divisions: 24, points, cornerIds: [ids[0], ids[2], ids[3]], edgeParams: { [ids[1]]: 0.5 } };
}

/** Unequal pair, shared edge (0,0,0)-(1,0,0) (B reversed), third corners lifted differently. */
function linkedPair(joint: PatchJoint) {
  const a = triangle('a', [v(0, 0, 0), v(1, 0, 0), v(0.5, 1, 0.3)], v(0, 0.15, 0.25), 0.2, joint);
  const b = triangle('b', [v(1, 0, 0), v(0, 0, 0), v(0.9, -2.5, 0.8)], v(0, -0.3, 0.05), 0.4, joint);
  const link = (s: string, e: string, ps: string, pe: string, partner: string): PatchEdgeLink =>
    ({ startPointId: s, endPointId: e, partnerEntityId: partner, partnerStartPointId: ps, partnerEndPointId: pe });
  a.edgeLinks = [link('ac0', 'am', 'bc1', 'bm', 'B'), link('am', 'ac1', 'bm', 'bc0', 'B')];
  b.edgeLinks = [link('bc1', 'bm', 'ac0', 'am', 'A'), link('bm', 'bc0', 'am', 'ac1', 'A')];
  if (joint === 'smooth') {coupleOpposite(a, b);}
  return { a, b };
}

/**
 * Puts the facing handles of the shared points opposite (average across the x-axis edge),
 * as shared points do: yellow <-> yellow, and at the corners the neighboring-edge pinks.
 */
function coupleOpposite(a: PatchParams, b: PatchParams): void {
  const axis = new Vector3(1, 0, 0);
  const pairs: [string, string, 'handleNext' | 'handlePrev' | null, 'handleNext' | 'handlePrev' | null][] = [
    ['ac0', 'bc1', 'handlePrev', 'handleNext'],
    ['am', 'bm', null, null],
    ['ac1', 'bc0', 'handleNext', 'handlePrev'],
  ];
  const get = (params: PatchParams, id: string): PatchPoint => {
    const found = params.points.find((p) => p.id === id);
    if (!found) {throw new Error(`missing ${id}`);}
    return found;
  };
  const off = (p: PatchPoint, k: 'handleNext' | 'handlePrev' | 'handleCrossIn') => new Vector3(p[k].x - p.pos.x, p[k].y - p.pos.y, p[k].z - p.pos.z);
  const set = (p: PatchPoint, k: 'handleNext' | 'handlePrev' | 'handleCrossIn', o: Vector3) => { p[k] = add(p.pos, v(o.x, o.y, o.z)); };
  for (const [ida, idb, ka, kb] of pairs) {
    const pa = get(a, ida);
    const pb = get(b, idb);
    const [ya, yb] = averageOpposite(off(pa, 'handleCrossIn'), off(pb, 'handleCrossIn'), axis);
    set(pa, 'handleCrossIn', ya);
    set(pb, 'handleCrossIn', yb);
    if (ka && kb) {
      const [qa, qb] = averageOpposite(off(pa, ka), off(pb, kb), axis);
      set(pa, ka, qa);
      set(pb, kb, qb);
    }
  }
}

type Surface = (u: number, vv: number, w: number) => Vector3;
const corrected = (params: PatchParams): Surface => {
  const prepared = prepareEdgeCorrection(params);
  return (u, vv, w) => (prepared
    ? evalEdgeCorrectedSurface(prepared, triangleEdgeCoordinates(u, vv, w))
    : evalPatchSurfacePoint(params, u, vv, w));
};
const classic = (params: PatchParams): Surface => (u, vv, w) => evalPatchSurfacePoint(params, u, vv, w);

function edgeNormal(surface: Surface, t: number): Vector3 {
  const h = 1e-6;
  const p = surface(1 - t, t, 0);
  const along = surface(1 - t - h, t + h, 0).sub(p);
  const inward = surface((1 - t) * (1 - h), t * (1 - h), h).sub(p);
  return along.cross(inward).normalize();
}

const SAMPLES = [0.02, 0.05, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 0.95, 0.98];

function maxKink(a: Surface, b: Surface): number {
  let worst = 0;
  for (const t of SAMPLES) {
    const dot = Math.abs(edgeNormal(a, t).dot(edgeNormal(b, 1 - t)));
    worst = Math.max(worst, (Math.acos(Math.min(1, dot)) * 180) / Math.PI);
  }
  return worst;
}

describe('classic surface with linked-edge correction', () => {
  it('leaves unlinked patches exactly classic', () => {
    expect(prepareEdgeCorrection(defaultPatchParamsForKind('triangle-patch'))).toBeNull();
    expect(prepareEdgeCorrection(defaultPatchParamsForKind('quad-patch'))).toBeNull();
  });

  it('removes the crease along the whole linked edge with smooth joints', () => {
    const smooth = linkedPair('smooth');
    const kinkClassic = maxKink(classic(smooth.a), classic(smooth.b));
    const kinkCorrected = maxKink(corrected(smooth.a), corrected(smooth.b));
    expect(kinkClassic).toBeGreaterThan(5);
    expect(kinkCorrected).toBeLessThan(0.1);
  });

  it('keeps the edges exactly in place', () => {
    const { a } = linkedPair('smooth');
    const surface = corrected(a);
    for (const t of [0, 0.1, 0.33, 0.5, 0.8, 1]) {
      expect(surface(1 - t, t, 0).distanceTo(evalEdge(a, 0, t))).toBeLessThan(1e-9);
      expect(surface(0, 1 - t, t).distanceTo(evalEdge(a, 1, t))).toBeLessThan(1e-9);
      expect(surface(t, 0, 1 - t).distanceTo(evalEdge(a, 2, t))).toBeLessThan(1e-9);
    }
  });

  it('is exactly classic outside the strip and close to it inside', () => {
    const { a } = linkedPair('smooth');
    const prepared = prepareEdgeCorrection(a)!;
    const n = 40;
    let maxInside = 0;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; i + j <= n; j++) {
        const u = i / n;
        const vv = j / n;
        const w = 1 - u - vv;
        const c = evalPatchSurfacePoint(a, u, vv, w);
        const s = evalEdgeCorrectedSurface(prepared, triangleEdgeCoordinates(u, vv, w));
        if (w >= prepared.blend) {
          expect(s.distanceTo(c)).toBeLessThan(1e-12);
        } else {
          maxInside = Math.max(maxInside, s.distanceTo(c));
        }
      }
    }
    // Shape deviation inside the strip stays small compared to the 1 m patch.
    expect(maxInside).toBeLessThan(0.1);
  });

  it('does not correct corner joints', () => {
    const { a } = linkedPair('corner');
    expect(prepareEdgeCorrection(a)).toBeNull();
  });

  it('stays finite at and near the corners', () => {
    const { a } = linkedPair('smooth');
    const surface = corrected(a);
    for (const e of [0, 1e-12, 1e-6, 1e-3]) {
      for (const p of [surface(1 - 2 * e, e, e), surface(e, 1 - 2 * e, e), surface(e, e, 1 - 2 * e)]) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
      }
    }
  });

  it('works for quads', () => {
    const q = defaultPatchParamsForKind('quad-patch');
    const [p0, p1] = q.points;
    const params: PatchParams = {
      ...q,
      points: q.points.map((p) => (p.id === p0.id || p.id === p1.id ? { ...p, joint: 'smooth' as const, pinkPair: 'coupled' as const } : p)),
      edgeLinks: [{ startPointId: p0.id, endPointId: p1.id, partnerEntityId: 'X', partnerStartPointId: 'x0', partnerEndPointId: 'x1' }],
    };
    const prepared = prepareEdgeCorrection(params)!;
    expect(prepared).not.toBeNull();
    for (const s of [0, 0.3, 0.7, 1]) {
      const edge = evalEdgeCorrectedSurface(prepared, quadEdgeCoordinates(s, 0));
      expect(edge.distanceTo(evalQuadPatchSurfacePoint(params, s, 0))).toBeLessThan(1e-9);
    }
    const center = evalEdgeCorrectedSurface(prepared, quadEdgeCoordinates(0.5, 0.5));
    expect(center.distanceTo(evalQuadPatchSurfacePoint(params, 0.5, 0.5))).toBeLessThan(1e-12);
  });

  it('builds meshes whose normals match across the linked edge (no light seam)', () => {
    const { a, b } = linkedPair('smooth');
    const meshes = [a, b].map((params) => {
      const geometry = buildTrianglePatchGeometry(params);
      const prepared = prepareEdgeCorrection(params);
      if (prepared) {applyEdgeCorrectionToGeometry(geometry, prepared);}
      return geometry;
    });
    const boundary = (g: (typeof meshes)[number]) => {
      const pos = g.getAttribute('position');
      const nor = g.getAttribute('normal');
      const out: { x: number; n: Vector3 }[] = [];
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        if (Math.abs(pos.getY(i)) < 1e-6 && Math.abs(pos.getZ(i)) < 1e-6 && x > 1e-6 && x < 1 - 1e-6) {
          out.push({ x, n: new Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)) });
        }
      }
      return out;
    };
    const na = boundary(meshes[0]);
    const nb = boundary(meshes[1]);
    expect(na.length).toBeGreaterThan(10);
    let worst = 0;
    let matched = 0;
    for (const pa of na) {
      const pb = nb.find((q) => Math.abs(q.x - pa.x) < 1e-5);
      if (!pb) {continue;}
      matched++;
      worst = Math.max(worst, (Math.acos(Math.min(1, Math.abs(pa.n.dot(pb.n)))) * 180) / Math.PI);
    }
    expect(matched).toBeGreaterThan(10);
    expect(worst).toBeLessThan(0.1);
    for (const g of meshes) {
      expect(Array.from(g.getAttribute('normal').array).every(Number.isFinite)).toBe(true);
      expect(Array.from(g.getAttribute('position').array).every(Number.isFinite)).toBe(true);
    }
  });
});
