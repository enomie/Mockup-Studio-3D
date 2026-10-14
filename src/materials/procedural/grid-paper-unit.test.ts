import { describe, expect, it } from 'vitest';
import {
  gridUnitToTileScale,
  resolveGridPaperTileScale,
  tileScaleToGridUnit,
} from './grid-paper-unit';

describe('grid-paper-unit', () => {
  it('maps units to lines per meter', () => {
    expect(gridUnitToTileScale('mm')).toBe(1000);
    expect(gridUnitToTileScale('cm')).toBe(100);
    expect(gridUnitToTileScale('dm')).toBe(10);
    expect(gridUnitToTileScale('m')).toBe(1);
  });

  it('infers unit from legacy tileScale', () => {
    expect(tileScaleToGridUnit(1000)).toBe('mm');
    expect(tileScaleToGridUnit(100)).toBe('cm');
    expect(tileScaleToGridUnit(10)).toBe('dm');
    expect(tileScaleToGridUnit(1)).toBe('m');
  });

  it('prefers explicit gridUnit over tileScale', () => {
    expect(resolveGridPaperTileScale('cm', 1000)).toBe(100);
  });
});
