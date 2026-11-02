import { describe, expect, it } from 'vitest';
import {
  LEGACY_MATERIAL_GLOSSY_PRINT_ID,
  MATERIAL_PAPER_ID,
} from './material-ids';
import {
  clampPassepartoutOffsetM,
  computePassepartoutInnerBounds,
  DEFAULT_IMAGE_SURFACE,
  imageSurfaceSupportsPassepartout,
  migrateImageSurfaces,
  PASSEPARTOUT_COLOR_BLACK,
  PASSEPARTOUT_COLOR_WHITE,
  resolveImageSurfaceSettings,
  type ImageSurfaceSettings,
} from './image-surface';

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
            gloss: 0.25,
            emissiveEnabled: true,
            emissiveIntensity: 0.5,
            passepartoutColor: PASSEPARTOUT_COLOR_BLACK,
            passepartoutOffsetM: 0.01,
            passepartoutGloss: 0.75,
          },
        },
        'front',
        { assetKind: 'picture' },
      ),
    ).toEqual({
      gloss: 0.25,
      emissiveEnabled: true,
      emissiveIntensity: 0.5,
      passepartoutColor: PASSEPARTOUT_COLOR_BLACK,
      passepartoutOffsetM: 0.01,
      passepartoutGloss: 0.75,
    });
  });

  it('migrates legacy matt/glossy finish to gloss values', () => {
    const legacy = {
      finish: 'matt',
      emissiveEnabled: false,
      emissiveIntensity: 0,
      passepartoutColor: PASSEPARTOUT_COLOR_WHITE,
      passepartoutOffsetM: 0,
      passepartoutFinish: 'glossy',
    } as unknown as ImageSurfaceSettings;
    const resolved = resolveImageSurfaceSettings({ front: legacy }, 'front');
    expect(resolved.gloss).toBe(0);
    expect(resolved.passepartoutGloss).toBe(1);
    expect(resolved).not.toHaveProperty('finish');
    expect(resolved).not.toHaveProperty('passepartoutFinish');
  });

  it('prefers a stored gloss over the legacy finish', () => {
    const stored = {
      ...DEFAULT_IMAGE_SURFACE,
      finish: 'matt',
      gloss: 0.6,
    } as unknown as ImageSurfaceSettings;
    expect(resolveImageSurfaceSettings({ front: stored }, 'front').gloss).toBeCloseTo(0.6, 6);
  });

  it('defaults to a glossy image and a matt passepartout', () => {
    const resolved = resolveImageSurfaceSettings(undefined, 'front');
    expect(resolved.gloss).toBe(1);
    expect(resolved.passepartoutGloss).toBe(0);
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
      gloss: 0,
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
        frontMaterialId: LEGACY_MATERIAL_GLOSSY_PRINT_ID,
        backMaterialId: MATERIAL_PAPER_ID,
      },
    });

    expect(migrated?.front?.gloss).toBe(1);
    expect(migrated?.back?.gloss).toBe(0);
  });

  it('reads slot gloss from already migrated Paper slots', () => {
    const migrated = migrateImageSurfaces({
      assetKind: 'picture',
      screenImageId: null,
      materials: {
        frontMaterialId: MATERIAL_PAPER_ID,
        slotGloss: { frontMaterialId: 1 },
      },
    });

    expect(migrated?.front?.gloss).toBe(1);
  });
});
