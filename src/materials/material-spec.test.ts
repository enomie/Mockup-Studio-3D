import { describe, expect, it } from 'vitest';
import type { MaterialPreset, ProceduralProfileId } from '@/scene/material-types';
import {
  defaultTileScaleForProfile,
  proceduralProfileSpec,
  resolveMaterialSpec,
  type MaterialSpec,
  type RangeSpec,
} from './material-spec';

const PROFILES: ProceduralProfileId[] = [
  'wood-soft', 'wood-porous', 'paper-grain', 'fabric-linen', 'silk-fine',
  'concrete-stained', 'concrete-porous', 'metal-polished', 'metal-brushed',
  'glass-surface', 'grid-paper-opaque', 'grid-paper-lines', 'coated-gloss',
  'plastic-matte', 'plastic-smooth', 'carbon-weave',
];

function ranges(spec: MaterialSpec): RangeSpec[] {
  return [
    spec.roughness,
    spec.metalness,
    spec.clearcoat?.amount,
    spec.clearcoat?.roughness,
    spec.normalScale,
    spec.tileScale,
    spec.anisotropy?.amount,
    spec.anisotropy?.rotation,
    spec.sheen?.amount,
    spec.sheen?.roughness,
    spec.glass?.ior,
    spec.glass?.surfaceNormalScale,
    spec.glass?.surfaceTileScale,
  ].filter((range): range is RangeSpec => range !== undefined);
}

function preset(partial: Partial<MaterialPreset>): MaterialPreset {
  return { id: 'p', name: 'P', source: 'user', kind: 'solid-pbr', ...partial };
}

describe('material spec', () => {
  it.each(PROFILES)('%s has a spec with defaults inside their ranges', (profile) => {
    for (const range of ranges(proceduralProfileSpec(profile))) {
      expect(range.min).toBeLessThanOrEqual(range.default);
      expect(range.default).toBeLessThanOrEqual(range.max);
    }
  });

  it('keeps previous tile scale defaults', () => {
    expect(defaultTileScaleForProfile('wood-soft')).toBe(6);
    expect(defaultTileScaleForProfile('paper-grain')).toBe(400);
    expect(defaultTileScaleForProfile('grid-paper-opaque')).toBe(1000);
    expect(defaultTileScaleForProfile('fabric-linen')).toBe(6);
    expect(defaultTileScaleForProfile('metal-polished')).toBe(4);
  });

  it('keeps the wood lacquer as a visible clearcoat default', () => {
    expect(proceduralProfileSpec('wood-soft').clearcoat?.amount.default).toBe(0.08);
  });

  it('brushed metal exposes relief, tile scale and seed', () => {
    const spec = proceduralProfileSpec('metal-brushed');
    expect(spec.normalScale).toBeDefined();
    expect(spec.tileScale?.default).toBe(28);
    expect(spec.seed).toBe(true);
    expect(spec.anisotropy).toBeDefined();
  });

  it('silk is a non-metallic fabric with sheen', () => {
    const spec = proceduralProfileSpec('silk-fine');
    expect(spec.metalness).toBeUndefined();
    expect(spec.sheen?.amount.default).toBe(1);
    expect(spec.physical).toBe(true);
  });

  it('grid paper uses a unit select and no seed', () => {
    const spec = proceduralProfileSpec('grid-paper-opaque');
    expect(spec.gridUnit).toBe(true);
    expect(spec.seed).toBeUndefined();
    expect(spec.lineColor).toBeDefined();
  });

  it('resolves glass and solid specs', () => {
    const glass = resolveMaterialSpec(preset({ kind: 'transmission', glassVariant: 'solid' }));
    expect(glass.colorField).toBe('tint');
    expect(glass.label).toBe('Glass solid');
    expect(glass.glass?.ior.default).toBe(1.52);
    const solid = resolveMaterialSpec(preset({}));
    expect(solid.colorField).toBe('color');
    expect(solid.clearcoat).toBeDefined();
  });
});

describe('roughness spec', () => {
  it('uses the full 0–1 range for every profile (no hidden shader clamps)', () => {
    for (const profile of PROFILES) {
      const { roughness } = proceduralProfileSpec(profile);
      expect(roughness.min).toBe(0);
      expect(roughness.max).toBe(1);
    }
  });

  it('has profile-specific roughness defaults', () => {
    expect(proceduralProfileSpec('metal-polished').roughness.default).toBe(0.08);
    expect(proceduralProfileSpec('concrete-stained').roughness.default).toBe(0.92);
  });
});

describe('carbon spec', () => {
  it('is a non-metallic clear-coated physical material with anisotropy', () => {
    const spec = proceduralProfileSpec('carbon-weave');
    expect(spec.physical).toBe(true);
    expect(spec.metalness).toBeUndefined();
    expect(spec.clearcoat?.amount.default).toBe(1);
    expect(spec.anisotropy?.amount.default).toBe(0.5);
  });
});

