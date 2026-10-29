export const SDF_EPS = 1e-6;

export function sdfRoundBoxLocal(
  lx: number,
  ly: number,
  lz: number,
  half: number,
  radius: number,
): number {
  const ax = Math.abs(lx);
  const ay = Math.abs(ly);
  const az = Math.abs(lz);
  const qx = ax - half + radius;
  const qy = ay - half + radius;
  const qz = az - half + radius;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const oz = Math.max(qz, 0);
  const outside = Math.sqrt(ox * ox + oy * oy + oz * oz);
  const inside = Math.min(Math.max(qx, Math.max(qy, qz)), 0);
  return outside + inside - radius;
}

export function sdfRoundBoxGradientLocal(
  lx: number,
  ly: number,
  lz: number,
  half: number,
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

export function transformPointInverse(
  mInv: Float32Array,
  wx: number,
  wy: number,
  wz: number,
): [number, number, number] {
  const t12 = mInv[12] ?? 0;
  const t13 = mInv[13] ?? 0;
  const t14 = mInv[14] ?? 0;
  return [
    (mInv[0] ?? 0) * wx + (mInv[4] ?? 0) * wy + (mInv[8] ?? 0) * wz + t12,
    (mInv[1] ?? 0) * wx + (mInv[5] ?? 0) * wy + (mInv[9] ?? 0) * wz + t13,
    (mInv[2] ?? 0) * wx + (mInv[6] ?? 0) * wy + (mInv[10] ?? 0) * wz + t14,
  ];
}

export function transformLocalNormalToWorld(
  m: Float32Array,
  lx: number,
  ly: number,
  lz: number,
): [number, number, number] {
  const wx = (m[0] ?? 0) * lx + (m[4] ?? 0) * ly + (m[8] ?? 0) * lz;
  const wy = (m[1] ?? 0) * lx + (m[5] ?? 0) * ly + (m[9] ?? 0) * lz;
  const wz = (m[2] ?? 0) * lx + (m[6] ?? 0) * ly + (m[10] ?? 0) * lz;
  const len = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
  return [wx / len, wy / len, wz / len];
}
