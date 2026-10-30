import { describe, expect, it } from 'vitest';
import {
  clonePatchPoint,
  defaultTrianglePatchParams,
  getPatchCorners,
  type PatchPoint,
  type TrianglePatchParams,
} from '@/scene/asset-triangle-patch';
import {
  buildTrianglePatchGeometry,
  evalCross,
  evalCubicBezierEdge,
  evalEdge,
  evalPatchSurfacePoint,
} from './triangle-patch-geometry';
import { Vector3 } from 'three/webgpu';

describe('triangle-patch-geometry', () => {
  it('evaluates cubic bezier edge endpoints correctly', () => {
    const params = defaultTrianglePatchParams();
    const [nA, nB] = getPatchCorners(params);

    const start = new Vector3();
    const end = new Vector3();

    evalCubicBezierEdge(nA, nB, 0, start);
    evalCubicBezierEdge(nA, nB, 1, end);

    expect(start.x).toBeCloseTo(nA.pos.x);
    expect(start.y).toBeCloseTo(nA.pos.y);
    expect(start.z).toBeCloseTo(nA.pos.z);

    expect(end.x).toBeCloseTo(nB.pos.x);
    expect(end.y).toBeCloseTo(nB.pos.y);
    expect(end.z).toBeCloseTo(nB.pos.z);
  });

  it('evaluates patch surface corner points at barycentric corners', () => {
    const params = defaultTrianglePatchParams();
    const corners = getPatchCorners(params);
    const [nA, nB, nC] = corners;

    const ptA = new Vector3();
    const ptB = new Vector3();
    const ptC = new Vector3();

    // Corner A: u=1, v=0, w=0
    evalPatchSurfacePoint(params, 1, 0, 0, ptA);
    expect(ptA.x).toBeCloseTo(nA.pos.x);
    expect(ptA.y).toBeCloseTo(nA.pos.y);
    expect(ptA.z).toBeCloseTo(nA.pos.z);

    // Corner B: u=0, v=1, w=0
    evalPatchSurfacePoint(params, 0, 1, 0, ptB);
    expect(ptB.x).toBeCloseTo(nB.pos.x);
    expect(ptB.y).toBeCloseTo(nB.pos.y);
    expect(ptB.z).toBeCloseTo(nB.pos.z);

    // Corner C: u=0, v=0, w=1
    evalPatchSurfacePoint(params, 0, 0, 1, ptC);
    expect(ptC.x).toBeCloseTo(nC.pos.x);
    expect(ptC.y).toBeCloseTo(nC.pos.y);
    expect(ptC.z).toBeCloseTo(nC.pos.z);
  });

  it('builds a valid BufferGeometry with positions, uvs, indices and normals', () => {
    const params = defaultTrianglePatchParams();
    params.divisions = 6;
    const geom = buildTrianglePatchGeometry(params);

    const expectedVerts = ((6 + 1) * (6 + 2)) / 2; // 28 vertices
    expect(geom.getAttribute('position').count).toBe(expectedVerts);
    expect(geom.getAttribute('uv').count).toBe(expectedVerts);
    expect(geom.getAttribute('normal').count).toBe(expectedVerts);
    expect(geom.getIndex()).not.toBeNull();
    expect(geom.getIndex()!.count).toBeGreaterThan(0);
  });

  it('matches the corner-only formula when the patch has no edge points', () => {
    const params = defaultTrianglePatchParams();
    const pt = new Vector3();
    for (const [u, v] of [[0.2, 0.3], [0.5, 0.25], [0.1, 0.1], [0.6, 0.35], [1 / 3, 1 / 3]]) {
      const w = 1 - u - v;
      evalPatchSurfacePoint(params, u, v, w, pt);
      const ref = cornerOnlyReference(getPatchCorners(params), u, v, w);
      expect(pt.distanceTo(ref)).toBeLessThan(1e-9);
    }
  });

  it('runs every edge through the anchors of its edge points', () => {
    const params = patchWithEdgePoint(0.4);
    const pt = new Vector3();
    evalEdge(params, 1, 0.4, pt);
    const anchor = params.points[2].pos;
    expect(pt.distanceTo(new Vector3(anchor.x, anchor.y, anchor.z))).toBeLessThan(1e-9);
  });

  it('keeps the boundary exactly on the edge curves', () => {
    const params = patchWithEdgePoint(0.4);
    const surface = new Vector3();
    const edge = new Vector3();
    for (const t of [0.1, 0.4, 0.7]) {
      // Edge 1 runs corner 1 -> corner 2, i.e. u = 0, w = t.
      evalPatchSurfacePoint(params, 0, 1 - t, t, surface);
      evalEdge(params, 1, t, edge);
      expect(surface.distanceTo(edge)).toBeLessThan(1e-9);
    }
  });

  it('lets the cross tangent of an edge point bulge the interior but not the boundary', () => {
    const params = patchWithEdgePoint(0.5);
    const lifted = structuredClone(params);
    lifted.points[2].handleCrossIn.y += 0.3;

    const cross = new Vector3();
    evalCross(lifted, 1, 0.5, cross);
    expect(cross.y - (params.points[2].handleCrossIn.y - params.points[2].pos.y)).toBeCloseTo(0.3);

    const before = new Vector3();
    const after = new Vector3();
    evalPatchSurfacePoint(params, 0.2, 0.4, 0.4, before);
    evalPatchSurfacePoint(lifted, 0.2, 0.4, 0.4, after);
    expect(after.y).toBeGreaterThan(before.y + 0.01);

    evalPatchSurfacePoint(params, 0, 0.5, 0.5, before);
    evalPatchSurfacePoint(lifted, 0, 0.5, 0.5, after);
    expect(after.distanceTo(before)).toBeLessThan(1e-9);
  });
});

/** Default patch with a point on edge 1 (between corner 1 and corner 2) at parameter `t`. */
function patchWithEdgePoint(t: number): TrianglePatchParams {
  const params = defaultTrianglePatchParams();
  const [, b, c] = getPatchCorners(params);
  const extra: PatchPoint = {
    ...clonePatchPoint(b),
    id: 'pt-4',
    name: 'Point 4',
    pos: { x: (b.pos.x + c.pos.x) / 2, y: (b.pos.y + c.pos.y) / 2 + 0.1, z: (b.pos.z + c.pos.z) / 2 },
  };
  extra.handleCrossIn = { x: extra.pos.x - 0.1, y: extra.pos.y + 0.1, z: extra.pos.z };
  params.points.splice(2, 0, extra);
  params.edgeParams[extra.id] = t;
  return params;
}

/** The original corner-only surface formula, kept as a regression reference. */
function cornerOnlyReference(
  [a, b, c]: readonly [PatchPoint, PatchPoint, PatchPoint],
  u: number,
  v: number,
  w: number,
): Vector3 {
  const vec = (p: { x: number; y: number; z: number }) => new Vector3(p.x, p.y, p.z);
  const out = vec(a.pos).multiplyScalar(u).addScaledVector(vec(b.pos), v).addScaledVector(vec(c.pos), w);
  const edges = [[a, b, u, v], [b, c, v, w], [c, a, w, u]] as const;
  for (const [start, end, wa, wb] of edges) {
    const sum = wa + wb;
    if (sum <= 0.0001) {continue;}
    const t = wb / sum;
    const curve = evalCubicBezierEdge(start, end, t);
    const line = vec(start.pos).lerp(vec(end.pos), t);
    out.addScaledVector(curve.sub(line), sum);
  }
  const bulge = vec(a.handleCrossIn).sub(vec(a.pos)).multiplyScalar(u)
    .add(vec(b.handleCrossIn).sub(vec(b.pos)).multiplyScalar(v))
    .add(vec(c.handleCrossIn).sub(vec(c.pos)).multiplyScalar(w));
  return out.addScaledVector(bulge, 27 * u * v * w * 0.65);
}
