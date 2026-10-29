import type { BufferGeometry } from 'three/webgpu';

/**
 * MikkTSpace tangents for anisotropic PBR (brushed metal, silk).
 * Without a `tangent` attribute, WebGPU/TSL falls back to derivative-based TBN
 * (see three.js TangentUtils) — constant per triangle → visible faceting in specular.
 */
export function ensureGeometryTangents(geometry: BufferGeometry): void {
  const hasUv =
    geometry.hasAttribute('uv') || geometry.hasAttribute('uv1');
  if (!hasUv) {
    return;
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
