import { describe, expect, it } from 'vitest';
import { defaultTrianglePatchParams } from '@/scene/asset-triangle-patch';
import {
  buildTrianglePatchGeometry,
  evalCubicBezierEdge,
  evalPatchSurfacePoint,
} from './triangle-patch-geometry';
import { Vector3 } from 'three/webgpu';

describe('triangle-patch-geometry', () => {
  it('evaluates cubic bezier edge endpoints correctly', () => {
    const params = defaultTrianglePatchParams();
    const [nA, nB] = params.nodes;

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
    const [nA, nB, nC] = params.nodes;

    const ptA = new Vector3();
    const ptB = new Vector3();
    const ptC = new Vector3();

    // Corner A: u=1, v=0, w=0
    evalPatchSurfacePoint(params.nodes, 1, 0, 0, ptA);
    expect(ptA.x).toBeCloseTo(nA.pos.x);
    expect(ptA.y).toBeCloseTo(nA.pos.y);
    expect(ptA.z).toBeCloseTo(nA.pos.z);

    // Corner B: u=0, v=1, w=0
    evalPatchSurfacePoint(params.nodes, 0, 1, 0, ptB);
    expect(ptB.x).toBeCloseTo(nB.pos.x);
    expect(ptB.y).toBeCloseTo(nB.pos.y);
    expect(ptB.z).toBeCloseTo(nB.pos.z);

    // Corner C: u=0, v=0, w=1
    evalPatchSurfacePoint(params.nodes, 0, 0, 1, ptC);
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
});

