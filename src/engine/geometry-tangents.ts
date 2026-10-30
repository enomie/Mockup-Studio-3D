import type { BufferGeometry } from 'three/webgpu';

/**
 * MikkTSpace tangents for anisotropic PBR (brushed metal, silk).
 * Without a `tangent` attribute, WebGPU/TSL falls back to derivative-based TBN
 * (see three.js TangentUtils) — constant per triangle → visible faceting in specular.
 */
export function ensureGeometryTangents(geometry: BufferGeometry): void {
  // computeTangents() reads only `uv`; `uv1` alone would make it fail.
  if (!geometry.hasAttribute('uv')) {
    return;
  }
  // computeTangents() requires an index. ExtrudeGeometry and CSG output are non-indexed;
  // a trivial index keeps every vertex (hard edges stay intact).
  if (!geometry.index) {
    const count = geometry.getAttribute('position').count;
    if (count % 3 !== 0) {
      return;
    }
    geometry.setIndex(Array.from({ length: count }, (_, i) => i));
  }
  if (!geometry.hasAttribute('normal')) {
    geometry.computeVertexNormals();
  }
  geometry.computeTangents();
  // computeTangents() reuses an existing attribute without flagging it, so deformed
  // meshes (live cloth) would keep stale rest-pose tangents on the GPU.
  if (geometry.hasAttribute('tangent')) {
    geometry.getAttribute('tangent').needsUpdate = true;
  }
}
