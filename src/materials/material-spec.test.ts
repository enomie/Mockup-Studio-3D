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
  'plastic-matte', 'plastic-smooth',
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

  it('hides controls the brushed shader ignores', () => {
    for (const profile of ['metal-brushed', 'silk-fine'] as const) {
      const spec = proceduralProfileSpec(profile);
      expect(spec.normalScale).toBeUndefined();
      expect(spec.seed).toBeUndefined();
      expect(spec.tileScale).toBeUndefined();
      expect(spec.anisotropy).toBeDefined();
    }
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
