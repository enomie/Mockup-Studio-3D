import {
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
} from 'three/webgpu';
import type { TrianglePatchParams, PatchNodeData } from '@/scene/asset-triangle-patch';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

const _pA = new Vector3();
const _pB = new Vector3();
const _pC = new Vector3();
const _bA = new Vector3();
const _bB = new Vector3();
const _bC = new Vector3();

/**
 * Evaluates a cubic Bezier edge between two nodes (nA -> nB).
 * nA uses handleNext, nB uses handlePrev.
 */
export function evalCubicBezierEdge(
  nA: PatchNodeData,
  nB: PatchNodeData,
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

/**
 * Evaluates the 3D surface at barycentric coordinates (u, v, w) with u + v + w = 1.
 * Nodes: [A, B, C]
 * Edge 0: A -> B
 * Edge 1: B -> C
 * Edge 2: C -> A
 */
export function evalPatchSurfacePoint(
  nodes: readonly [PatchNodeData, PatchNodeData, PatchNodeData],
  u: number,
  v: number,
  w: number,
  out: Vector3 = new Vector3(),
): Vector3 {
  const [nodeA, nodeB, nodeC] = nodes;
  const A = nodeA.pos;
  const B = nodeB.pos;
  const C = nodeC.pos;

  // 1. Lineare Planare Basis
  const lx = u * A.x + v * B.x + w * C.x;
  const ly = u * A.y + v * B.y + w * C.y;
  const lz = u * A.z + v * B.z + w * C.z;

  let dx = 0;
  let dy = 0;
  let dz = 0;

  // 2. Kanten-Korrekturen (Coon's Patch Blend)
  // Kante AB (u + v)
  if (u + v > 0.0001) {
    const tAB = v / (u + v);
    evalCubicBezierEdge(nodeA, nodeB, tAB, _pA);
    const linX = (1 - tAB) * A.x + tAB * B.x;
    const linY = (1 - tAB) * A.y + tAB * B.y;
    const linZ = (1 - tAB) * A.z + tAB * B.z;
    dx += (u + v) * (_pA.x - linX);
    dy += (u + v) * (_pA.y - linY);
    dz += (u + v) * (_pA.z - linZ);
  }

  // Kante BC (v + w)
  if (v + w > 0.0001) {
    const tBC = w / (v + w);
    evalCubicBezierEdge(nodeB, nodeC, tBC, _pB);
    const linX = (1 - tBC) * B.x + tBC * C.x;
    const linY = (1 - tBC) * B.y + tBC * C.y;
    const linZ = (1 - tBC) * B.z + tBC * C.z;
    dx += (v + w) * (_pB.x - linX);
    dy += (v + w) * (_pB.y - linY);
    dz += (v + w) * (_pB.z - linZ);
  }

  // Kante CA (w + u)
  if (w + u > 0.0001) {
    const tCA = u / (w + u);
    evalCubicBezierEdge(nodeC, nodeA, tCA, _pC);
    const linX = (1 - tCA) * C.x + tCA * A.x;
    const linY = (1 - tCA) * C.y + tCA * A.y;
    const linZ = (1 - tCA) * C.z + tCA * A.z;
    dx += (w + u) * (_pC.x - linX);
    dy += (w + u) * (_pC.y - linY);
    dz += (w + u) * (_pC.z - linZ);
  }

  // 3. Central bulge (cross-tangent interior deformation)
  const centerBulge = 27.0 * u * v * w * 0.65;
  _bA.set(nodeA.handleCrossIn.x - A.x, nodeA.handleCrossIn.y - A.y, nodeA.handleCrossIn.z - A.z).multiplyScalar(u);
  _bB.set(nodeB.handleCrossIn.x - B.x, nodeB.handleCrossIn.y - B.y, nodeB.handleCrossIn.z - B.z).multiplyScalar(v);
  _bC.set(nodeC.handleCrossIn.x - C.x, nodeC.handleCrossIn.y - C.y, nodeC.handleCrossIn.z - C.z).multiplyScalar(w);

  out.x = lx + dx + (_bA.x + _bB.x + _bC.x) * centerBulge;
  out.y = ly + dy + (_bA.y + _bB.y + _bC.y) * centerBulge;
  out.z = lz + dz + (_bA.z + _bB.z + _bC.z) * centerBulge;

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

      evalPatchSurfacePoint(params.nodes, u, v, w, pt);

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

