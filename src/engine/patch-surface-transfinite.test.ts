import { describe, expect, it } from 'vitest';
import type { Vector3 } from 'three/webgpu';
import {
  defaultPatchParamsForKind,
  type PatchParams,
  type PatchPoint,
} from '@/scene/asset-triangle-patch';
import type { Vec3 } from '@/scene/entity-types';
import { insertPatchPoint } from '@/scene/triangle-patch-point-edit';
import { evalEdge, evalPatchSurfacePoint } from './triangle-patch-geometry';
import {
  buildTransfiniteQuadGeometry,
  buildTransfiniteTriangleGeometry,
  evalPreparedCross,
  evalTransfiniteSurface,
  prepareTransfiniteSurface,
  quadEdgeCoordinates,
  triangleEdgeCoordinates,
} from './patch-surface-transfinite';

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
const add = (a: Vec3, b: Vec3): Vec3 => v(a.x + b.x, a.y + b.y, a.z + b.z);

/**
 * Triangle with straight edges; edge 0 (c0 -> c1) gets one edge point at its middle with
 * the given yellow handle offset. Corner yellow handles are zero (no bulge).
 */
function straightTriangle(c: [Vec3, Vec3, Vec3], middleCross: Vec3): PatchParams {
  const m = lerp(c[0], c[1], 0.5);
  const loop: { id: string; pos: Vec3; cross: Vec3 }[] = [
    { id: 'c0', pos: c[0], cross: v(0, 0, 0) },
    { id: 'm', pos: m, cross: middleCross },
    { id: 'c1', pos: c[1], cross: v(0, 0, 0) },
    { id: 'c2', pos: c[2], cross: v(0, 0, 0) },
  ];
  const points: PatchPoint[] = loop.map((p, i) => {
    const next = loop[(i + 1) % loop.length].pos;
    const prev = loop[(i + loop.length - 1) % loop.length].pos;
    return {
      id: p.id,
      name: p.id,
      pos: p.pos,
      handleNext: lerp(p.pos, next, 1 / 3),
      handlePrev: lerp(p.pos, prev, 1 / 3),
      handleCrossIn: add(p.pos, p.cross),
      handleCrossOut: add(p.pos, v(-p.cross.x, -p.cross.y, -p.cross.z)),
    };
  });
  return { divisions: 24, points, cornerIds: ['c0', 'c1', 'c2'], edgeParams: { m: 0.5 } };
}

type Surface = (u: number, vv: number, w: number) => Vector3;

const tangentSurface = (params: PatchParams): Surface => {
  const prepared = prepareTransfiniteSurface(params);
  return (u, vv, w) => evalTransfiniteSurface(prepared, triangleEdgeCoordinates(u, vv, w));
};
const classicSurface = (params: PatchParams): Surface => (u, vv, w) => evalPatchSurfacePoint(params, u, vv, w);

/** Normal of the surface at edge 0, parameter t, from finite differences (along + inward). */
function edgeNormal(surface: Surface, t: number): Vector3 {
  const h = 1e-6;
  const p = surface(1 - t, t, 0);
  const along = surface(1 - (t + h), t + h, 0).sub(p);
  const inward = surface((1 - t) * (1 - h), t * (1 - h), h).sub(p);
  return along.cross(inward).normalize();
}

function kinkDeg(a: Surface, b: Surface, t: number): number {
  // Patch B runs the shared edge the other way: its parameter is 1 - t.
  const dot = Math.abs(edgeNormal(a, t).dot(edgeNormal(b, 1 - t)));
  return (Math.acos(Math.min(1, dot)) * 180) / Math.PI;
}

const SAMPLES = [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95];

describe('transfinite patch surface (Smooth Edges)', () => {
  it('lies exactly on every edge curve', () => {
    const triangle = insertPatchPoint(defaultPatchParamsForKind('triangle-patch'), 1, 0.4).params;
    const tri = prepareTransfiniteSurface(triangle);
    for (const t of [0, 0.13, 0.5, 0.77, 1]) {
      const s = evalTransfiniteSurface(tri, triangleEdgeCoordinates(t, 0, 1 - t)); // edge 2: c2 -> c0
      const e = evalEdge(triangle, 2, t);
      expect(s.distanceTo(e)).toBeLessThan(1e-9);
      const s1 = evalTransfiniteSurface(tri, triangleEdgeCoordinates(0, 1 - t, t)); // edge 1
      expect(s1.distanceTo(evalEdge(triangle, 1, t))).toBeLessThan(1e-9);
    }
    const quadParams = insertPatchPoint(defaultPatchParamsForKind('quad-patch'), 2, 0.3).params;
    const quad = prepareTransfiniteSurface(quadParams);
    for (const t of [0, 0.21, 0.5, 0.9, 1]) {
      expect(evalTransfiniteSurface(quad, quadEdgeCoordinates(t, 0)).distanceTo(evalEdge(quadParams, 0, t))).toBeLessThan(1e-9);
      expect(evalTransfiniteSurface(quad, quadEdgeCoordinates(1 - t, 1)).distanceTo(evalEdge(quadParams, 2, t))).toBeLessThan(1e-9);
    }
  });

  it('leaves each edge exactly in the direction of its cross derivative', () => {
    const params = insertPatchPoint(defaultPatchParamsForKind('triangle-patch'), 0, 0.5).params;
    const prepared = prepareTransfiniteSurface(params);
    let worst = 0;
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const h = 1e-6;
      const p = evalTransfiniteSurface(prepared, triangleEdgeCoordinates(1 - t, t, 0));
      const q = evalTransfiniteSurface(prepared, triangleEdgeCoordinates((1 - t) * (1 - h), t * (1 - h), h));
      const fd = q.sub(p).normalize();
      const d = evalPreparedCross(prepared.edges[0], t).normalize();
      worst = Math.max(worst, (Math.acos(Math.min(1, fd.dot(d))) * 180) / Math.PI);
    }
    expect(worst).toBeLessThan(0.1);
  });

  it('has no crease between unequal linked patches with opposite yellow handles', () => {
    // Same setup as the original measurement: shared edge (0,0,0)-(1,0,0), A small, B large and skewed.
    const a = straightTriangle([v(0, 0, 0), v(1, 0, 0), v(0.5, 1, 0)], v(0, 0.2, 0.2));
    // B runs the shared edge reversed; its yellow handle is opposite and half as long.
    const b = straightTriangle([v(1, 0, 0), v(0, 0, 0), v(0.9, -2.5, 0)], v(0, -0.1, -0.1));
    let worstTangent = 0;
    let worstClassic = 0;
    for (const t of SAMPLES) {
      const kt = kinkDeg(tangentSurface(a), tangentSurface(b), t);
      const kc = kinkDeg(classicSurface(a), classicSurface(b), t);
      worstTangent = Math.max(worstTangent, kt);
      worstClassic = Math.max(worstClassic, kc);
    }
    expect(worstTangent).toBeLessThan(0.1);
    expect(worstClassic).toBeGreaterThan(1);
  });

  it('is still crease-free at the edge point when the corners are not aligned', () => {
    const a = straightTriangle([v(0, 0, 0), v(1, 0, 0), v(0.5, 1, 0.3)], v(0, 0.2, 0.2));
    const b = straightTriangle([v(1, 0, 0), v(0, 0, 0), v(0.9, -2.5, 0.8)], v(0, -0.1, -0.1));
    expect(kinkDeg(tangentSurface(a), tangentSurface(b), 0.5)).toBeLessThan(0.1);
  });

  it('stays finite and continuous at and near the corners', () => {
    const tri = prepareTransfiniteSurface(defaultPatchParamsForKind('triangle-patch'));
    const quad = prepareTransfiniteSurface(defaultPatchParamsForKind('quad-patch'));
    const check = (p: Vector3) => {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
    };
    for (const e of [0, 1e-12, 1e-8, 1e-4, 1e-2]) {
      check(evalTransfiniteSurface(tri, triangleEdgeCoordinates(1 - 2 * e, e, e)));
      check(evalTransfiniteSurface(quad, quadEdgeCoordinates(e, e)));
      check(evalTransfiniteSurface(quad, quadEdgeCoordinates(1 - e, 1 - e)));
    }
    const corner = evalTransfiniteSurface(tri, triangleEdgeCoordinates(1, 0, 0));
    const near = evalTransfiniteSurface(tri, triangleEdgeCoordinates(1 - 2e-6, 1e-6, 1e-6));
    expect(corner.distanceTo(near)).toBeLessThan(1e-4);
  });

  it('has no crease between two unequal linked quads', () => {
    const quad = (c: [Vec3, Vec3, Vec3, Vec3], middleCross: Vec3): PatchParams => {
      const ids = ['c0', 'm', 'c1', 'c2', 'c3'];
      const pos = [c[0], lerp(c[0], c[1], 0.5), c[1], c[2], c[3]];
      const cross = [v(0, 0, 0), middleCross, v(0, 0, 0), v(0, 0, 0), v(0, 0, 0)];
      const points: PatchPoint[] = ids.map((id, i) => ({
        id,
        name: id,
        pos: pos[i],
        handleNext: lerp(pos[i], pos[(i + 1) % 5], 1 / 3),
        handlePrev: lerp(pos[i], pos[(i + 4) % 5], 1 / 3),
        handleCrossIn: add(pos[i], cross[i]),
        handleCrossOut: pos[i],
      }));
      return { divisions: 24, points, cornerIds: ['c0', 'c1', 'c2', 'c3'], edgeParams: { m: 0.5 } };
    };
    // Shared edge (0,0,0)-(1,0,0); A goes +z (small), B goes -z (large, skewed). Neighbor edges in the y=0 plane.
    const a = prepareTransfiniteSurface(quad([v(0, 0, 0), v(1, 0, 0), v(1.1, 0, 0.8), v(-0.1, 0, 1)], v(0, 0.3, 0.2)));
    const b = prepareTransfiniteSurface(quad([v(1, 0, 0), v(0, 0, 0), v(-0.4, 0, -2), v(1.6, 0, -1.7)], v(0, -0.15, -0.1)));
    const normal = (srf: typeof a, t: number) => {
      const h = 1e-6;
      const p = evalTransfiniteSurface(srf, quadEdgeCoordinates(t, 0));
      const along = evalTransfiniteSurface(srf, quadEdgeCoordinates(t + h, 0)).sub(p);
      const inward = evalTransfiniteSurface(srf, quadEdgeCoordinates(t, h)).sub(p);
      return along.cross(inward).normalize();
    };
    let worst = 0;
    for (const t of SAMPLES) {
      const dot = Math.abs(normal(a, t).dot(normal(b, 1 - t)));
      worst = Math.max(worst, (Math.acos(Math.min(1, dot)) * 180) / Math.PI);
    }
    expect(worst).toBeLessThan(0.1);
  });

  it('builds meshes whose normals match across the shared edge (no light seam)', () => {
    const a = buildTransfiniteTriangleGeometry(straightTriangle([v(0, 0, 0), v(1, 0, 0), v(0.5, 1, 0)], v(0, 0.2, 0.2)));
    const b = buildTransfiniteTriangleGeometry(straightTriangle([v(1, 0, 0), v(0, 0, 0), v(0.9, -2.5, 0)], v(0, -0.1, -0.1)));
    const boundary = (g: typeof a) => {
      const pos = g.getAttribute('position');
      const nor = g.getAttribute('normal');
      const out: { x: number; n: [number, number, number] }[] = [];
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        if (Math.abs(pos.getY(i)) < 1e-6 && Math.abs(pos.getZ(i)) < 1e-6 && x > 1e-6 && x < 1 - 1e-6) {
          out.push({ x, n: [nor.getX(i), nor.getY(i), nor.getZ(i)] });
        }
      }
      return out;
    };
    const na = boundary(a);
    const nb = boundary(b);
    expect(na.length).toBeGreaterThan(10);
    let worst = 0;
    for (const pa of na) {
      const pb = nb.find((q) => Math.abs(q.x - pa.x) < 1e-6);
      if (!pb) {continue;}
      const dot = Math.abs(pa.n[0] * pb.n[0] + pa.n[1] * pb.n[1] + pa.n[2] * pb.n[2]);
      worst = Math.max(worst, (Math.acos(Math.min(1, dot)) * 180) / Math.PI);
    }
    expect(worst).toBeLessThan(0.1);
    for (const g of [a, b, buildTransfiniteQuadGeometry(defaultPatchParamsForKind('quad-patch'))]) {
      const arr = g.getAttribute('normal').array;
      expect(Array.from(arr).every(Number.isFinite)).toBe(true);
      expect(Array.from(g.getAttribute('position').array).every(Number.isFinite)).toBe(true);
    }
  });
});
