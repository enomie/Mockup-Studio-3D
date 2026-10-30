import {
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
} from 'three/webgpu';
import { getPatchCorners, type PatchParams } from '@/scene/asset-triangle-patch';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';
import { evalCross, evalEdge } from '@/engine/triangle-patch-geometry';

const _edge = new Vector3();
const _cross = new Vector3();
const _bulge = new Vector3();

/** Same bulge strength as the triangle patch. */
const BULGE_STRENGTH = 0.65;

/**
 * Evaluates a quad patch at (s, t) in [0, 1]^2. Corners 0..3 sit at (0,0), (1,0), (1,1), (0,1);
 * edge 0 runs along t = 0, edge 1 along s = 1, edge 2 along t = 1 (s reversed), edge 3 along s = 0 (t reversed).
 */
export function evalQuadPatchSurfacePoint(
  params: PatchParams,
  s: number,
  t: number,
  out: Vector3 = new Vector3(),
): Vector3 {
  const [c0, c1, c2, c3] = getPatchCorners(params).map((corner) => corner.pos);
  // Edge parameter along each edge, and how strongly that edge's cross field reaches (s, t).
  const edges = [
    [s, 1 - t],
    [t, s],
    [1 - s, t],
    [1 - t, 1 - s],
  ] as const;

  // 1. Bilinear Coons patch: both lofts minus the bilinear corner surface, so the boundary is exact.
  out.set(0, 0, 0);
  for (let e = 0; e < 4; e++) {
    const [edgeT, reach] = edges[e];
    evalEdge(params, e, edgeT, _edge);
    out.addScaledVector(_edge, reach);
  }
  const w0 = (1 - s) * (1 - t);
  const w1 = s * (1 - t);
  const w2 = s * t;
  const w3 = (1 - s) * t;
  out.x -= w0 * c0.x + w1 * c1.x + w2 * c2.x + w3 * c3.x;
  out.y -= w0 * c0.y + w1 * c1.y + w2 * c2.y + w3 * c3.y;
  out.z -= w0 * c0.z + w1 * c1.z + w2 * c2.z + w3 * c3.z;

  // 2. Bulge from every edge's cross-tangent field, weighted by closeness to that edge
  // (the reaches sum to 2), and zero on the boundary so the edges stay exact.
  _bulge.set(0, 0, 0);
  for (let e = 0; e < 4; e++) {
    const [edgeT, reach] = edges[e];
    evalCross(params, e, edgeT, _cross);
    _bulge.addScaledVector(_cross, reach / 2);
  }
  out.addScaledVector(_bulge, 16 * s * (1 - s) * t * (1 - t) * BULGE_STRENGTH);
  return out;
}

/** Creates a divisions x divisions grid BufferGeometry for a quad patch; UVs are (s, t). */
export function buildQuadPatchGeometry(params: PatchParams): BufferGeometry {
  const divisions = Math.max(2, Math.min(64, params.divisions || 24));
  const row = divisions + 1;
  const positions = new Float32Array(row * row * 3);
  const uvs = new Float32Array(row * row * 2);
  const pt = new Vector3();

  for (let j = 0; j <= divisions; j++) {
    for (let i = 0; i <= divisions; i++) {
      const index = j * row + i;
      const s = i / divisions;
      const t = j / divisions;
      evalQuadPatchSurfacePoint(params, s, t, pt);
      positions[index * 3] = pt.x;
      positions[index * 3 + 1] = pt.y;
      positions[index * 3 + 2] = pt.z;
      uvs[index * 2] = s;
      uvs[index * 2 + 1] = t;
    }
  }

  const indices: number[] = [];
  for (let j = 0; j < divisions; j++) {
    for (let i = 0; i < divisions; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row + 1;
      const d = a + row;
      indices.push(a, b, c, a, c, d);
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
