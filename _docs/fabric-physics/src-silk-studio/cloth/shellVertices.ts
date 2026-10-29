import type { BufferAttribute, BufferGeometry } from 'three';
import { vec3Get, vec3GetAt } from '../utils/floatBuffer.ts';

export interface ShellVertexUpdateOptions {
  computeTangents?: boolean;
  computeBounds?: boolean;
}

export function updateClothShellVertices(
  geometry: BufferGeometry,
  pos: Float32Array,
  segX: number,
  segY: number,
  halfThick: number,
  options?: ShellVertexUpdateOptions,
): void {
  const computeTangents = options?.computeTangents ?? true;
  const computeBounds = options?.computeBounds ?? false;

  const nx = segX + 1;
  const ny = segY + 1;
  const planeVerts = nx * ny;

  const posAttr = geometry.getAttribute('position') as BufferAttribute;
  const normAttr = geometry.getAttribute('normal') as BufferAttribute;
  const posArr = posAttr.array as Float32Array;
  const normArr = normAttr.array as Float32Array;

  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const idx = y * nx + x;

      const xPrev = Math.max(0, x - 1);
      const xNext = Math.min(nx - 1, x + 1);
      const yPrev = Math.max(0, y - 1);
      const yNext = Math.min(ny - 1, y + 1);

      const [tx, ty, tz] = vec3GetAt(pos, (y * nx + xNext) * 3);
      const [txL, tyL, tzL] = vec3GetAt(pos, (y * nx + xPrev) * 3);
      const tangentX = tx - txL;
      const tangentY = ty - tyL;
      const tangentZ = tz - tzL;

      const [bx, by, bz] = vec3GetAt(pos, (yNext * nx + x) * 3);
      const [bxD, byD, bzD] = vec3GetAt(pos, (yPrev * nx + x) * 3);
      const bitangentX = bx - bxD;
      const bitangentY = by - byD;
      const bitangentZ = bz - bzD;

      let nxVal = tangentY * bitangentZ - tangentZ * bitangentY;
      let nyVal = tangentZ * bitangentX - tangentX * bitangentZ;
      let nzVal = tangentX * bitangentY - tangentY * bitangentX;

      const len = Math.sqrt(nxVal * nxVal + nyVal * nyVal + nzVal * nzVal) || 1;
      nxVal /= len;
      nyVal /= len;
      nzVal /= len;

      const [cx, cy, cz] = vec3Get(pos, idx);

      const topOffset = halfThick;
      posArr[idx * 3] = cx + nxVal * topOffset;
      posArr[idx * 3 + 1] = cy + nyVal * topOffset;
      posArr[idx * 3 + 2] = cz + nzVal * topOffset;

      normArr[idx * 3] = nxVal;
      normArr[idx * 3 + 1] = nyVal;
      normArr[idx * 3 + 2] = nzVal;

      const bIdx = (planeVerts + idx) * 3;
      posArr[bIdx] = cx - nxVal * topOffset;
      posArr[bIdx + 1] = cy - nyVal * topOffset;
      posArr[bIdx + 2] = cz - nzVal * topOffset;

      normArr[bIdx] = -nxVal;
      normArr[bIdx + 1] = -nyVal;
      normArr[bIdx + 2] = -nzVal;
    }
  }

  posAttr.needsUpdate = true;
  normAttr.needsUpdate = true;

  if (computeTangents && geometry.attributes.tangent) {
    geometry.computeTangents();
  }

  if (computeBounds) {
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
  }
}
