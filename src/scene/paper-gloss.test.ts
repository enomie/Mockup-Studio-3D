import { describe, expect, it } from 'vitest';
import {
  defaultMaterialsForKind,
  MATERIAL_PRESETS,
  migrateMaterialSlots,
} from '@/data/material-presets';
import { migrateImageSurfaces } from './image-surface';
import {
  LEGACY_MATERIAL_GLOSSY_PRINT_ID,
  MATERIAL_PAPER_ID,
  MATERIAL_PLASTIC_MATTE_ID,
  migrateMaterialId,
} from './material-ids';
import type { MaterialPreset } from './material-types';
import { applyPaperGloss, clampGloss, resolveSlotGloss } from './paper-gloss';

function paperPreset(): MaterialPreset {
  const preset = MATERIAL_PRESETS.find((entry) => entry.id === MATERIAL_PAPER_ID);
  if (!preset) {throw new Error('Paper preset missing');}
  return preset;
}

describe('applyPaperGloss', () => {
  it('returns the matt preset unchanged at gloss 0 or undefined', () => {
    const paper = paperPreset();
    expect(applyPaperGloss(paper, 0)).toBe(paper);
    expect(applyPaperGloss(paper, undefined)).toBe(paper);
  });

  it('reaches the glossy end point at gloss 1', () => {
    const glossy = applyPaperGloss(paperPreset(), 1);
    expect(glossy.roughness).toBeCloseTo(0.15, 6);
    expect(glossy.clearcoat).toBeCloseTo(0.35, 6);
    expect(glossy.clearcoatRoughness).toBeCloseTo(0.12, 6);
  });

  it('interpolates in between', () => {
    const paper = paperPreset();
    const half = applyPaperGloss(paper, 0.5);
    expect(half.roughness).toBeCloseTo(((paper.roughness ?? 1) + 0.15) / 2, 6);
    expect(half.clearcoat).toBeCloseTo(0.175, 6);
  });

  it('leaves other presets untouched', () => {
    const plastic = MATERIAL_PRESETS.find((entry) => entry.id === MATERIAL_PLASTIC_MATTE_ID);
    if (!plastic) {throw new Error('Plastic preset missing');}
    expect(applyPaperGloss(plastic, 1)).toBe(plastic);
  });

  it('clamps out-of-range values', () => {
    expect(clampGloss(-1)).toBe(0);
    expect(clampGloss(2)).toBe(1);
    expect(clampGloss(Number.NaN)).toBe(0);
  });
});

describe('resolveSlotGloss', () => {
  it('prefers stored gloss', () => {
    expect(
      resolveSlotGloss(
        { blockMaterialId: MATERIAL_PAPER_ID, slotGloss: { blockMaterialId: 0.4 } },
        'blockMaterialId',
      ),
    ).toBeCloseTo(0.4, 6);
  });

  it('treats an assigned Paper without gloss as matt', () => {
    expect(resolveSlotGloss({ frontMaterialId: MATERIAL_PAPER_ID }, 'frontMaterialId')).toBe(0);
    expect(resolveSlotGloss({ blockMaterialId: MATERIAL_PAPER_ID }, 'blockMaterialId')).toBe(0);
  });

  it('treats empty front/back slots as glossy (former default)', () => {
    expect(resolveSlotGloss({}, 'frontMaterialId')).toBe(1);
    expect(resolveSlotGloss(undefined, 'backMaterialId')).toBe(1);
    expect(resolveSlotGloss({}, 'sideMaterialId')).toBe(0);
  });
});

describe('legacy Print Glossy migration', () => {
  it('maps the material id to Paper', () => {
    expect(migrateMaterialId(LEGACY_MATERIAL_GLOSSY_PRINT_ID)).toBe(MATERIAL_PAPER_ID);
  });

  it('stores gloss 1 on slots that held Print Glossy', () => {
    const migrated = migrateMaterialSlots({
      bookCoverMaterialId: LEGACY_MATERIAL_GLOSSY_PRINT_ID,
      bookPagesMaterialId: MATERIAL_PAPER_ID,
    });
    expect(migrated.bookCoverMaterialId).toBe(MATERIAL_PAPER_ID);
    expect(migrated.slotGloss?.bookCoverMaterialId).toBe(1);
    expect(migrated.slotGloss?.bookPagesMaterialId).toBeUndefined();
  });

  it('keeps a stored gloss over the legacy id', () => {
    const migrated = migrateMaterialSlots({
      blockMaterialId: LEGACY_MATERIAL_GLOSSY_PRINT_ID,
      slotGloss: { blockMaterialId: 0.3 },
    });
    expect(migrated.slotGloss?.blockMaterialId).toBeCloseTo(0.3, 6);
  });
});

describe('default materials', () => {
  it('keep a glossy front image surface for new pictures and prints', () => {
    for (const kind of ['picture', 'print', 'wall', 'smartphone'] as const) {
      const materials = migrateMaterialSlots(defaultMaterialsForKind(kind));
      expect(resolveSlotGloss(materials, 'frontMaterialId')).toBe(1);
      const surfaces = migrateImageSurfaces({ assetKind: kind, materials, screenImageId: null });
      if (surfaces?.front) {expect(surfaces.front.gloss).toBe(1);}
    }
  });
});
