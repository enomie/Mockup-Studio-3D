import { describe, expect, it } from 'vitest';
import { upsampleGridCatmullRom } from '@/physics/cloth/catmull-rom-grid';

function grid(nx: number, ny: number, f: (x: number, y: number) => number): Float32Array {
  const out = new Float32Array(nx * ny * 3);
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const i = (y * nx + x) * 3;
      out[i] = x;
      out[i + 1] = y;
      out[i + 2] = f(x, y);
    }
  }
  return out;
}

describe('upsampleGridCatmullRom', () => {
  it('passes through every source vertex', () => {
    const src = grid(5, 4, (x, y) => Math.sin(x) * Math.cos(y));
    const dense = upsampleGridCatmullRom(src, 5, 4, 3);
    expect(dense.nx).toBe(13);
    expect(dense.ny).toBe(10);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 5; x++) {
        const s = (y * 5 + x) * 3;
        const d = (y * 3 * 13 + x * 3) * 3;
        for (let k = 0; k < 3; k++) {
          expect(dense.values[d + k]).toBeCloseTo(src[s + k], 6);
        }
      }
    }
  });

  it('keeps flat and linear cloth exactly flat (no overshoot)', () => {
    const src = grid(4, 4, (x, y) => 0.1 * x + 0.05 * y);
    const dense = upsampleGridCatmullRom(src, 4, 4, 4);
    for (let i = 0; i < dense.nx * dense.ny; i++) {
      const x = dense.values[i * 3];
      const y = dense.values[i * 3 + 1];
      expect(dense.values[i * 3 + 2]).toBeCloseTo(0.1 * x + 0.05 * y, 6);
    }
  });

  it('follows a fold more closely than linear interpolation', () => {
    const f = (x: number): number => Math.sin(x * 0.8);
    const src = grid(8, 2, (x) => f(x));
    const dense = upsampleGridCatmullRom(src, 8, 2, 4);
    let splineErr = 0;
    let linearErr = 0;
    for (let ox = 4; ox < dense.nx - 4; ox++) {
      const x = ox / 4;
      const x0 = Math.floor(x);
      const t = x - x0;
      const linear = f(x0) * (1 - t) + f(x0 + 1) * t;
      splineErr = Math.max(splineErr, Math.abs(dense.values[ox * 3 + 2] - f(x)));
      linearErr = Math.max(linearErr, Math.abs(linear - f(x)));
    }
    expect(splineErr).toBeLessThan(linearErr * 0.5);
  });
});
