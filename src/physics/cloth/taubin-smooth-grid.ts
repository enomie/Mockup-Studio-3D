const TAUBIN_LAMBDA = 0.5;
const TAUBIN_MU = -0.53;

function laplacianStep(
  src: Float32Array,
  dst: Float32Array,
  nx: number,
  ny: number,
  factor: number,
): void {
  dst.set(src);
  for (let y = 1; y < ny - 1; y++) {
    for (let x = 1; x < nx - 1; x++) {
      const o = (y * nx + x) * 3;
      const l = o - 3;
      const r = o + 3;
      const d = o - nx * 3;
      const u = o + nx * 3;
      for (let k = 0; k < 3; k++) {
        const avg = (src[l + k] + src[r + k] + src[d + k] + src[u + k]) * 0.25;
        dst[o + k] = src[o + k] + factor * (avg - src[o + k]);
      }
    }
  }
}

/**
 * Taubin (λ/μ) smoothing on a vec3 grid (idx = y * nx + x). Removes high-frequency
 * simulation jitter without shrinking the surface; border vertices stay fixed.
 */
export function taubinSmoothGrid(
  src: Float32Array,
  nx: number,
  ny: number,
  iterations: number,
): Float32Array {
  const a = Float32Array.from(src);
  const b = new Float32Array(src.length);
  for (let i = 0; i < iterations; i++) {
    laplacianStep(a, b, nx, ny, TAUBIN_LAMBDA);
    laplacianStep(b, a, nx, ny, TAUBIN_MU);
  }
  return a;
}

/** Normalizes every vec3 in place (zero vectors are left untouched). */
export function normalizeVec3Array(values: Float32Array): void {
  for (let i = 0; i < values.length; i += 3) {
    const len = Math.hypot(values[i], values[i + 1], values[i + 2]);
    if (len > 0) {
      values[i] /= len;
      values[i + 1] /= len;
      values[i + 2] /= len;
    }
  }
}
