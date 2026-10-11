import { describe, expect, it } from 'vitest';
import {
  defaultWallpaperPattern,
  resolveWallpaperPattern,
  wallpaperStripHeightM,
} from './asset-wall';

describe('wallpaperStripHeightM', () => {
  it('derives height from image aspect ratio', () => {
    expect(wallpaperStripHeightM(0.53, 1000, 2000)).toBeCloseTo(1.06);
  });

  it('falls back when pixels missing', () => {
    expect(wallpaperStripHeightM(0.53, undefined, 2000, 2)).toBe(2);
    expect(wallpaperStripHeightM(0.53)).toBe(defaultWallpaperPattern().stripHeightM);
  });
});

describe('resolveWallpaperPattern', () => {
  it('overrides stripHeightM when image dimensions known', () => {
    const resolved = resolveWallpaperPattern(
      { stripWidthM: 1, stripHeightM: 99 },
      400,
      300,
    );
    expect(resolved.stripWidthM).toBe(1);
    expect(resolved.stripHeightM).toBeCloseTo(0.75);
  });
});
