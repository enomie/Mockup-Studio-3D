import { describe, expect, it } from 'vitest';
import { normalizeVec3Array, taubinSmoothGrid } from './taubin-smooth-grid';

function noisyGrid(nx: number, ny: number): Float32Array {
  const out = new Float32Array(nx * ny * 3);
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const o = (y * nx + x) * 3;
      out[o] = x;
      out[o + 1] = y;
      out[o + 2] = (x + y) % 2 === 0 ? 0.1 : -0.1;
    }
  }
  return out;
}

function interiorZVariance(g: Float32Array, nx: number, ny: number): number {
  let sum = 0;
  for (let y = 1; y < ny - 1; y++) {
    for (let x = 1; x < nx - 1; x++) {sum += g[(y * nx + x) * 3 + 2] ** 2;}
  }
  return sum;
}

describe('taubinSmoothGrid', () => {
  it('reduces high-frequency jitter and keeps border fixed', () => {
    const nx = 8;
    const ny = 6;
    const src = noisyGrid(nx, ny);
    const out = taubinSmoothGrid(src, nx, ny, 2);
    expect(interiorZVariance(out, nx, ny)).toBeLessThan(interiorZVariance(src, nx, ny) * 0.5);
    for (let x = 0; x < nx; x++) {
      for (const y of [0, ny - 1]) {
        const o = (y * nx + x) * 3;
        expect(Array.from(out.subarray(o, o + 3))).toEqual(Array.from(src.subarray(o, o + 3)));
      }
    }
  });

  it('keeps a flat plane unchanged', () => {
    const nx = 5;
    const ny = 5;
    const src = noisyGrid(nx, ny).map((v, i) => (i % 3 === 2 ? 0 : v));
    const out = taubinSmoothGrid(src, nx, ny, 3);
    for (let i = 0; i < src.length; i++) {expect(out[i]).toBeCloseTo(src[i], 5);}
  });
});

describe('normalizeVec3Array', () => {
  it('produces unit vectors', () => {
    const v = new Float32Array([3, 4, 0, 0, 0, 2]);
    normalizeVec3Array(v);
    expect(Math.hypot(v[0], v[1], v[2])).toBeCloseTo(1);
    expect(v[5]).toBeCloseTo(1);
  });
});
