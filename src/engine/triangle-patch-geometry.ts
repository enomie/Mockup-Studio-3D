import {
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
} from 'three/webgpu';
import {
  getPatchCorners,
  locatePatchEdgeSegment,
  type PatchPoint,
  type TrianglePatchParams,
} from '@/scene/asset-triangle-patch';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

const _pA = new Vector3();
const _pB = new Vector3();
const _bA = new Vector3();

/**
 * Evaluates a cubic Bezier edge between two nodes (nA -> nB).
 * nA uses handleNext, nB uses handlePrev.
 */
export function evalCubicBezierEdge(
  nA: PatchPoint,
  nB: PatchPoint,
  t: number,
  out: Vector3 = new Vector3(),
): Vector3 {
  const clampedT = Math.max(0, Math.min(1, t));
  const mt = 1 - clampedT;

  const p0 = nA.pos;
  const p1 = nA.handleNext;
  const p2 = nB.handlePrev;
  const p3 = nB.pos;

  out.x = mt * mt * mt * p0.x + 3 * mt * mt * clampedT * p1.x + 3 * mt * clampedT * clampedT * p2.x + clampedT * clampedT * clampedT * p3.x;
  out.y = mt * mt * mt * p0.y + 3 * mt * mt * clampedT * p1.y + 3 * mt * clampedT * clampedT * p2.y + clampedT * clampedT * clampedT * p3.y;
  out.z = mt * mt * mt * p0.z + 3 * mt * mt * clampedT * p1.z + 3 * mt * clampedT * clampedT * p2.z + clampedT * clampedT * clampedT * p3.z;
  return out;
}

/** Evaluates edge `edgeIndex` (corner e -> corner e+1) at `t` in [0, 1], across all its segments. */
export function evalEdge(
  params: TrianglePatchParams,
  edgeIndex: number,
  t: number,
  out: Vector3 = new Vector3(),
): Vector3 {
  const { start: a, end: b, s } = locatePatchEdgeSegment(params, edgeIndex, t);
  return evalCubicBezierEdge(a, b, s, out);
}

/** Cross-tangent offset (`handleCrossIn - pos`) along edge `edgeIndex`, interpolated between its points. */
export function evalCross(
  params: TrianglePatchParams,
  edgeIndex: number,
  t: number,
  out: Vector3 = new Vector3(),
): Vector3 {
  const { start: a, end: b, s } = locatePatchEdgeSegment(params, edgeIndex, t);
  out.x = (1 - s) * (a.handleCrossIn.x - a.pos.x) + s * (b.handleCrossIn.x - b.pos.x);
  out.y = (1 - s) * (a.handleCrossIn.y - a.pos.y) + s * (b.handleCrossIn.y - b.pos.y);
  out.z = (1 - s) * (a.handleCrossIn.z - a.pos.z) + s * (b.handleCrossIn.z - b.pos.z);
  return out;
}

/**
 * Evaluates the 3D surface at barycentric coordinates (u, v, w) with u + v + w = 1,
 * weighting corner 0, 1, 2. Edge 0: corner 0 -> 1, edge 1: 1 -> 2, edge 2: 2 -> 0.
 */
export function evalPatchSurfacePoint(
  params: TrianglePatchParams,
  u: number,
  v: number,
  w: number,
  out: Vector3 = new Vector3(),
): Vector3 {
  const [nodeA, nodeB, nodeC] = getPatchCorners(params);
  const A = nodeA.pos;
  const B = nodeB.pos;
  const C = nodeC.pos;

  // 1. Linear planar base
  out.set(u * A.x + v * B.x + w * C.x, u * A.y + v * B.y + w * C.y, u * A.z + v * B.z + w * C.z);

  // 2. Per edge: Coons blend of the edge curve, and the edge's cross-tangent field for the bulge.
  // With only corners, sum((a + b) / 2 * cross) reduces to u*cA + v*cB + w*cC.
  _bA.set(0, 0, 0);
  const edges = [
    [u, v, A, B],
    [v, w, B, C],
    [w, u, C, A],
  ] as const;
  for (let e = 0; e < 3; e++) {
    const [wa, wb, start, end] = edges[e];
    const sum = wa + wb;
    if (sum <= 0.0001) {continue;}
    const t = wb / sum;
    evalEdge(params, e, t, _pA);
    out.x += sum * (_pA.x - ((1 - t) * start.x + t * end.x));
    out.y += sum * (_pA.y - ((1 - t) * start.y + t * end.y));
    out.z += sum * (_pA.z - ((1 - t) * start.z + t * end.z));
    evalCross(params, e, t, _pB);
    _bA.addScaledVector(_pB, sum / 2);
  }

  // 3. Central bulge, zero on the boundary so the edges stay exact
  out.addScaledVector(_bA, 27.0 * u * v * w * 0.65);
  return out;
}

/**
 * Creates BufferGeometry for a triangle patch based on parameters.
 */
export function buildTrianglePatchGeometry(params: TrianglePatchParams): BufferGeometry {
  const divisions = Math.max(2, Math.min(64, params.divisions || 24));
  const totalVerts = ((divisions + 1) * (divisions + 2)) / 2;

  const positions = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  const gridIndex: number[][] = [];
  let vCounter = 0;
  const pt = new Vector3();

  for (let i = 0; i <= divisions; i++) {
    gridIndex[i] = [];
    for (let j = 0; j <= divisions - i; j++) {
      gridIndex[i][j] = vCounter;

      const u = i / divisions;
      const v = j / divisions;
      const w = (divisions - i - j) / divisions;

      evalPatchSurfacePoint(params, u, v, w, pt);

      const pIdx = vCounter * 3;
      positions[pIdx] = pt.x;
      positions[pIdx + 1] = pt.y;
      positions[pIdx + 2] = pt.z;

      const uvIdx = vCounter * 2;
      uvs[uvIdx] = u;
      uvs[uvIdx + 1] = v;

      vCounter++;
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j <= divisions - i; j++) {
      const p1 = gridIndex[i][j];
      const p2 = gridIndex[i + 1][j];
      const p3 = gridIndex[i][j + 1];
      indices.push(p1, p2, p3);
      if (j < divisions - i - 1) {
        const p4 = gridIndex[i + 1][j + 1];
        indices.push(p2, p4, p3);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  ensureGeometryTangents(geometry);

  return geometry;
}

