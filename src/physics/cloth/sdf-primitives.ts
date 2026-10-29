export const SDF_EPS = 1e-6;

export interface RoundBoxHalfExtents {
  x: number;
  y: number;
  z: number;
}

export function sdfRoundBoxLocal(
  lx: number,
  ly: number,
  lz: number,
  half: RoundBoxHalfExtents,
  radius: number,
): number {
  const qx = Math.abs(lx) - half.x + radius;
  const qy = Math.abs(ly) - half.y + radius;
  const qz = Math.abs(lz) - half.z + radius;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const oz = Math.max(qz, 0);
  const outside = Math.sqrt(ox * ox + oy * oy + oz * oz);
  const inside = Math.min(Math.max(qx, Math.max(qy, qz)), 0);
  return outside + inside - radius;
}

/** Capped cylinder along local Y; positive outside. Cylinder edge fillet (borderRadius) not modeled in v1. */
export function sdfCappedCylinderLocal(
  lx: number,
  ly: number,
  lz: number,
  radius: number,
  halfHeight: number,
): number {
  const radial = Math.hypot(lx, lz) - radius;
  const axial = Math.abs(ly) - halfHeight;
  const ox = Math.max(radial, 0);
  const oy = Math.max(axial, 0);
  return Math.min(Math.max(radial, axial), 0) + Math.hypot(ox, oy);
}

export function sdfCappedCylinderGradientLocal(
  lx: number,
  ly: number,
  lz: number,
  radius: number,
  halfHeight: number,
): [number, number, number] {
  const dx =
    sdfCappedCylinderLocal(lx + SDF_EPS, ly, lz, radius, halfHeight) -
    sdfCappedCylinderLocal(lx - SDF_EPS, ly, lz, radius, halfHeight);
  const dy =
    sdfCappedCylinderLocal(lx, ly + SDF_EPS, lz, radius, halfHeight) -
    sdfCappedCylinderLocal(lx, ly - SDF_EPS, lz, radius, halfHeight);
  const dz =
    sdfCappedCylinderLocal(lx, ly, lz + SDF_EPS, radius, halfHeight) -
    sdfCappedCylinderLocal(lx, ly, lz - SDF_EPS, radius, halfHeight);
  const len = Math.hypot(dx, dy, dz) || 1;
  return [dx / len, dy / len, dz / len];
}

export function sdfRoundBoxGradientLocal(
  lx: number,
  ly: number,
  lz: number,
  half: RoundBoxHalfExtents,
  radius: number,
): [number, number, number] {
  const dx =
    sdfRoundBoxLocal(lx + SDF_EPS, ly, lz, half, radius) -
    sdfRoundBoxLocal(lx - SDF_EPS, ly, lz, half, radius);
  const dy =
    sdfRoundBoxLocal(lx, ly + SDF_EPS, lz, half, radius) -
    sdfRoundBoxLocal(lx, ly - SDF_EPS, lz, half, radius);
  const dz =
    sdfRoundBoxLocal(lx, ly, lz + SDF_EPS, half, radius) -
    sdfRoundBoxLocal(lx, ly, lz - SDF_EPS, half, radius);
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  return [dx / len, dy / len, dz / len];
}

/** Signed distance: positive outside the sphere surface. */
export function sdfSphereWorld(
  wx: number,
  wy: number,
  wz: number,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
): number {
  const dx = wx - cx;
  const dy = wy - cy;
  const dz = wz - cz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - radius;
}

function mat4Element(m: Float32Array, row: number, col: number): number {
  return m[col * 4 + row] ?? 0;
}

export function transformPointInverse(
  mInv: Float32Array,
  wx: number,
  wy: number,
  wz: number,
): [number, number, number] {
  const t12 = mat4Element(mInv, 0, 3);
  const t13 = mat4Element(mInv, 1, 3);
  const t14 = mat4Element(mInv, 2, 3);
  return [
    mat4Element(mInv, 0, 0) * wx + mat4Element(mInv, 0, 1) * wy + mat4Element(mInv, 0, 2) * wz + t12,
    mat4Element(mInv, 1, 0) * wx + mat4Element(mInv, 1, 1) * wy + mat4Element(mInv, 1, 2) * wz + t13,
    mat4Element(mInv, 2, 0) * wx + mat4Element(mInv, 2, 1) * wy + mat4Element(mInv, 2, 2) * wz + t14,
  ];
}

export function transformLocalNormalToWorld(
  m: Float32Array,
  lx: number,
  ly: number,
  lz: number,
): [number, number, number] {
  const wx = mat4Element(m, 0, 0) * lx + mat4Element(m, 0, 1) * ly + mat4Element(m, 0, 2) * lz;
  const wy = mat4Element(m, 1, 0) * lx + mat4Element(m, 1, 1) * ly + mat4Element(m, 1, 2) * lz;
  const wz = mat4Element(m, 2, 0) * lx + mat4Element(m, 2, 1) * ly + mat4Element(m, 2, 2) * lz;
  const len = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
  return [wx / len, wy / len, wz / len];
}
