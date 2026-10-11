import { describe, expect, it } from 'vitest';
import {
  defaultGeometryVisibility,
  isGeometryVisible,
  migrateGeometryVisibility,
} from './geometry-visibility';
import type { AssetMaterialSlots } from './material-types';

describe('geometry visibility', () => {
  it('defaults all picture parts to visible', () => {
    expect(defaultGeometryVisibility('picture')).toEqual({
      frame: true,
      glazing: true,
      backWall: true,
    });
  });

  it('defaults all handheld parts to visible', () => {
    expect(defaultGeometryVisibility('smartphone')).toEqual({
      frame: true,
      glazing: true,
      backWall: true,
      outerBackPlate: true,
      sideButton: true,
    });
  });

  it('defaults all monitor parts to visible', () => {
    expect(defaultGeometryVisibility('monitor')).toEqual({
      frame: true,
      glazing: true,
      backWall: true,
      outerBackPlate: true,
      sideButton: true,
      standBase: true,
      standFoot: true,
    });
  });

  it('treats undefined part visibility as visible', () => {
    expect(isGeometryVisible({}, 'frame')).toBe(true);
    expect(isGeometryVisible({ frame: false }, 'frame')).toBe(false);
  });

  it('migrates legacy glazingEnabled=false into geometryVisibility.glazing', () => {
    expect(
      migrateGeometryVisibility('picture', undefined, {
        glazingEnabled: false,
      } as AssetMaterialSlots & {
        glazingEnabled: boolean;
      }),
    ).toEqual({
      frame: true,
      glazing: false,
      backWall: true,
    });
  });
});
