import type { BufferAttribute, BufferGeometry } from 'three/webgpu';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';
import { vec3GetAt } from '@/physics/cloth/float-buffer';

export interface PlaneVertexUpdateOptions {
  computeNormals?: boolean;
  computeBounds?: boolean;
}

/**
 * Smooth per-vertex normals for a cloth grid (idx = y * nx + x) from central
 * differences. Shared by the live simulation and the bake so both shade the same.
 */
export function writeClothGridNormals(
  pos: Float32Array,
  normals: Float32Array,
  nx: number,
  ny: number,
): void {
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const xPrev = Math.max(0, x - 1);
      const xNext = Math.min(nx - 1, x + 1);
      const yPrev = Math.max(0, y - 1);
      const yNext = Math.min(ny - 1, y + 1);

      const [rx, ry, rz] = vec3GetAt(pos, (y * nx + xNext) * 3);
      const [lx, ly, lz] = vec3GetAt(pos, (y * nx + xPrev) * 3);
      const tx = rx - lx;
      const ty = ry - ly;
      const tz = rz - lz;

      const [ux, uy, uz] = vec3GetAt(pos, (yNext * nx + x) * 3);
      const [dx, dy, dz] = vec3GetAt(pos, (yPrev * nx + x) * 3);
      const bx = ux - dx;
      const by = uy - dy;
      const bz = uz - dz;

      let nX = ty * bz - tz * by;
      let nY = tz * bx - tx * bz;
      let nZ = tx * by - ty * bx;
      const len = Math.sqrt(nX * nX + nY * nY + nZ * nZ) || 1;
      nX /= len;
      nY /= len;
      nZ /= len;

      const o = (y * nx + x) * 3;
      normals[o] = nX;
      normals[o + 1] = nY;
      normals[o + 2] = nZ;
    }
  }
}

/**
 * Copy centerline `pos` (idx = y * nx + x) into the cloth plane geometry and
 * recompute smooth grid normals (+Z for the rest plane).
 */
export function updateClothPlaneVertices(
  geometry: BufferGeometry,
  pos: Float32Array,
  segX: number,
  segY: number,
  options?: PlaneVertexUpdateOptions,
): void {
  const computeNormals = options?.computeNormals ?? true;
  const computeBounds = options?.computeBounds ?? false;

  const nx = segX + 1;
  const ny = segY + 1;

  const posAttr = geometry.getAttribute('position') as BufferAttribute;
  (posAttr.array as Float32Array).set(pos.subarray(0, nx * ny * 3));
  posAttr.needsUpdate = true;

  if (computeNormals) {
    const normAttr = geometry.getAttribute('normal') as BufferAttribute;
    writeClothGridNormals(pos, normAttr.array as Float32Array, nx, ny);
    normAttr.needsUpdate = true;
    ensureGeometryTangents(geometry);
  }

  if (computeBounds) {
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
  }
}
