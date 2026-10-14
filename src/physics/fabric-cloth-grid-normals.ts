import { Vector3 } from 'three/webgpu';

const _posU0 = new Vector3();
const _posU1 = new Vector3();
const _posV0 = new Vector3();
const _posV1 = new Vector3();
const _edgeU = new Vector3();
const _edgeV = new Vector3();
const _normal = new Vector3();

function clothGridVertexIndex(u: number, v: number, nu: number): number {
  return v * nu + u;
}

function readPosition(positions: Float32Array, vertexIndex: number, target: Vector3): void {
  const o = vertexIndex * 3;
  target.set(positions[o], positions[o + 1], positions[o + 2]);
}

/**
 * O(nu * nv) normals for a PlaneGeometry-style vertex grid (v * nu + u).
 * Winding: cross(edgeV, edgeU) matches Three's default XY plane (+Z) before mesh rotation.
 */
export function writeFabricClothGridNormalsFromPositions(
  positions: Float32Array,
  normals: Float32Array,
  nu: number,
  nv: number,
): void {
  for (let v = 0; v < nv; v++) {
    for (let u = 0; u < nu; u++) {
      const u0 = Math.max(0, u - 1);
      const u1 = Math.min(nu - 1, u + 1);
      const v0 = Math.max(0, v - 1);
      const v1 = Math.min(nv - 1, v + 1);

      readPosition(positions, clothGridVertexIndex(u1, v, nu), _posU1);
      readPosition(positions, clothGridVertexIndex(u0, v, nu), _posU0);
      _edgeU.subVectors(_posU1, _posU0);

      readPosition(positions, clothGridVertexIndex(u, v1, nu), _posV1);
      readPosition(positions, clothGridVertexIndex(u, v0, nu), _posV0);
      _edgeV.subVectors(_posV1, _posV0);

      _normal.crossVectors(_edgeV, _edgeU);
      const lenSq = _normal.lengthSq();
      if (lenSq < 1e-20) {
        _normal.set(0, 0, 1);
      } else {
        _normal.multiplyScalar(1 / Math.sqrt(lenSq));
      }

      const vi = clothGridVertexIndex(u, v, nu);
      const o = vi * 3;
      normals[o] = _normal.x;
      normals[o + 1] = _normal.y;
      normals[o + 2] = _normal.z;
    }
  }
}
