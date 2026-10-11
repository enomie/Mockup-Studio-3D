import { describe, expect, it } from 'vitest';
import {
  MATERIAL_GLOSSY_PRINT_ID,
  MATERIAL_PAPER_ID,
} from './material-ids';
import {
  clampPassepartoutOffsetM,
  computePassepartoutInnerBounds,
  DEFAULT_IMAGE_SURFACE,
  finishToMaterialId,
  imageSurfaceSupportsPassepartout,
  migrateImageSurfaces,
  PASSEPARTOUT_COLOR_BLACK,
  PASSEPARTOUT_COLOR_WHITE,
  resolveImageSurfaceSettings,
} from './image-surface';

describe('finishToMaterialId', () => {
  it('maps matt and glossy to print presets', () => {
    expect(finishToMaterialId('matt')).toBe(MATERIAL_PAPER_ID);
    expect(finishToMaterialId('glossy')).toBe(MATERIAL_GLOSSY_PRINT_ID);
  });
});

describe('imageSurfaceSupportsPassepartout', () => {
  it('is enabled for mockup screen assets only', () => {
    expect(imageSurfaceSupportsPassepartout('picture')).toBe(true);
    expect(imageSurfaceSupportsPassepartout('smartphone')).toBe(true);
    expect(imageSurfaceSupportsPassepartout('print')).toBe(true);
    expect(imageSurfaceSupportsPassepartout('wall')).toBe(false);
    expect(imageSurfaceSupportsPassepartout('block')).toBe(false);
  });
});

describe('clampPassepartoutOffsetM', () => {
  it('clamps offset so inner plane stays above minimum', () => {
    expect(clampPassepartoutOffsetM(0.1, 0.1, 0.1)).toBeCloseTo(0.0495, 4);
    expect(clampPassepartoutOffsetM(0, 0.5, 0.5)).toBe(0);
  });
});

describe('computePassepartoutInnerBounds', () => {
  it('shrinks inner size and radius by offset', () => {
    const bounds = computePassepartoutInnerBounds(0.1, 0.2, 0.01, 0.005);
    expect(bounds.effectiveOffsetM).toBe(0.005);
    expect(bounds.innerW).toBeCloseTo(0.09, 6);
    expect(bounds.innerH).toBeCloseTo(0.19, 6);
    expect(bounds.innerRadiusM).toBeCloseTo(0.005, 6);
  });

  it('keeps inner radius at zero when offset exceeds outer radius', () => {
    const bounds = computePassepartoutInnerBounds(0.5, 0.6, 0.002, 0.01);
    expect(bounds.innerRadiusM).toBe(0);
  });
});

describe('resolveImageSurfaceSettings', () => {
  it('returns defaults when face is unset', () => {
    expect(resolveImageSurfaceSettings(undefined, 'front')).toEqual(
      DEFAULT_IMAGE_SURFACE,
    );
  });

  it('uses black passepartout default for handheld', () => {
    expect(
      resolveImageSurfaceSettings(undefined, 'front', {
        assetKind: 'smartphone',
      }).passepartoutColor,
    ).toEqual(PASSEPARTOUT_COLOR_BLACK);
  });

  it('uses white passepartout default for picture', () => {
    expect(
      resolveImageSurfaceSettings(undefined, 'front', {
        assetKind: 'picture',
      }).passepartoutColor,
    ).toEqual(PASSEPARTOUT_COLOR_WHITE);
  });

  it('merges stored partial settings', () => {
    expect(
      resolveImageSurfaceSettings(
        {
          front: {
            finish: 'matt',
            emissiveEnabled: true,
            emissiveIntensity: 0.5,
            passepartoutColor: PASSEPARTOUT_COLOR_BLACK,
            passepartoutOffsetM: 0.01,
            passepartoutFinish: 'glossy',
          },
        },
        'front',
        { assetKind: 'picture' },
      ),
    ).toEqual({
      finish: 'matt',
      emissiveEnabled: true,
      emissiveIntensity: 0.5,
      passepartoutColor: PASSEPARTOUT_COLOR_BLACK,
      passepartoutOffsetM: 0.01,
      passepartoutFinish: 'glossy',
    });
  });
});

describe('migrateImageSurfaces', () => {
  it('migrates legacy frontMaterialId for picture entities', () => {
    const migrated = migrateImageSurfaces({
      assetKind: 'picture',
      screenImageId: null,
      materials: { frontMaterialId: MATERIAL_PAPER_ID },
    });

    expect(migrated?.front).toEqual({
      ...resolveImageSurfaceSettings(undefined, 'front', {
        assetKind: 'picture',
      }),
      finish: 'matt',
    });
  });

  it('migrates print back image face from backMaterialId', () => {
    const migrated = migrateImageSurfaces({
      assetKind: 'print',
      screenImageId: null,
      faces: {
        front: { mode: 'image', imageId: null },
        back: { mode: 'image', imageId: null },
        left: { mode: 'color', color: { r: 1, g: 1, b: 1 } },
        right: { mode: 'color', color: { r: 1, g: 1, b: 1 } },
        top: { mode: 'color', color: { r: 1, g: 1, b: 1 } },
        bottom: { mode: 'color', color: { r: 1, g: 1, b: 1 } },
      },
      materials: {
        frontMaterialId: MATERIAL_GLOSSY_PRINT_ID,
        backMaterialId: MATERIAL_PAPER_ID,
      },
    });

    expect(migrated?.front?.finish).toBe('glossy');
    expect(migrated?.back?.finish).toBe('matt');
  });
});
