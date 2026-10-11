import { describe, expect, it } from 'vitest';
import { positiveMod, wallpaperUvFromLocal } from './wall-wallpaper-uv';

const baseInput = {
  wallWidthM: 4,
  stripWidthM: 1,
  stripHeightM: 2,
  columnOffsetM: 1,
};

describe('wallpaperUvFromLocal', () => {
  it('uses no vertical shift in column 0', () => {
    const uv = wallpaperUvFromLocal({
      x: -1.5,
      y: 1,
      ...baseInput,
    });
    expect(uv.u).toBeCloseTo(0.5);
    expect(uv.v).toBeCloseTo(0.5);
  });

  it('applies column offset on odd columns (half-drop)', () => {
    const col0 = wallpaperUvFromLocal({
      x: 0.25,
      y: 0.5,
      ...baseInput,
    });
    const col1 = wallpaperUvFromLocal({
      x: 1.25,
      y: 1.5,
      ...baseInput,
    });
    expect(col0.v).toBeCloseTo(0.25);
    expect(col1.v).toBeCloseTo(col0.v);
  });

  it('uses straight grid when column offset is zero', () => {
    const col0 = wallpaperUvFromLocal({
      x: 0.25,
      y: 0.75,
      ...baseInput,
      columnOffsetM: 0,
    });
    const col1 = wallpaperUvFromLocal({
      x: 1.25,
      y: 0.75,
      ...baseInput,
      columnOffsetM: 0,
    });
    expect(col0.v).toBeCloseTo(0.375);
    expect(col1.v).toBeCloseTo(col0.v);
  });
});

describe('positiveMod', () => {
  it('wraps negative values', () => {
    expect(positiveMod(-0.25, 1)).toBeCloseTo(0.75);
  });
});
