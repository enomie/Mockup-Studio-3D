/** Uniform Catmull-Rom weight set for parameter t in [0, 1] (points p0..p3, curve p1→p2). */
function catmullRomWeights(t: number): [number, number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5 * (-t3 + 2 * t2 - t),
    0.5 * (3 * t3 - 5 * t2 + 2),
    0.5 * (-3 * t3 + 4 * t2 + t),
    0.5 * (t3 - t2),
  ];
}

/**
 * Upsamples a vec3 grid (idx = y * nx + x) by an integer factor per axis with
 * Catmull-Rom splines. The curve passes through every source vertex (pins and contacts
 * stay exact) and is smooth between them; edges clamp to the border vertex.
 * Returns the dense grid in the same row order with (nx − 1) · factor + 1 columns.
 */
export function upsampleGridCatmullRom(
  src: Float32Array,
  nx: number,
  ny: number,
  factor: number,
): { values: Float32Array; nx: number; ny: number } {
  const outNx = (nx - 1) * factor + 1;
  const outNy = (ny - 1) * factor + 1;

  // Pass 1: along x, rows unchanged.
  const rows = new Float32Array(outNx * ny * 3);
  for (let y = 0; y < ny; y++) {
    for (let ox = 0; ox < outNx; ox++) {
      const cell = Math.min(Math.floor(ox / factor), nx - 2);
      const w = catmullRomWeights(ox / factor - cell);
      for (let k = 0; k < 4; k++) {
        const sx = Math.min(nx - 1, Math.max(0, cell - 1 + k));
        const s = (y * nx + sx) * 3;
        const d = (y * outNx + ox) * 3;
        rows[d] += w[k] * src[s];
        rows[d + 1] += w[k] * src[s + 1];
        rows[d + 2] += w[k] * src[s + 2];
      }
    }
  }

  // Pass 2: along y.
  const values = new Float32Array(outNx * outNy * 3);
  for (let oy = 0; oy < outNy; oy++) {
    const cell = Math.min(Math.floor(oy / factor), ny - 2);
    const w = catmullRomWeights(oy / factor - cell);
    for (let k = 0; k < 4; k++) {
      const sy = Math.min(ny - 1, Math.max(0, cell - 1 + k));
      for (let ox = 0; ox < outNx; ox++) {
        const s = (sy * outNx + ox) * 3;
        const d = (oy * outNx + ox) * 3;
        values[d] += w[k] * rows[s];
        values[d + 1] += w[k] * rows[s + 1];
        values[d + 2] += w[k] * rows[s + 2];
      }
    }
  }

  return { values, nx: outNx, ny: outNy };
}
