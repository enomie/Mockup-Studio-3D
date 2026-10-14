import { describe, expect, it } from 'vitest';
import { migrateMaterialPreset } from '@/data/material-presets';
import { MATERIAL_CONCRETE_POROUS_ID } from '@/scene/material-ids';
import type { MaterialPreset } from '@/scene/material-types';

function userPreset(partial: Partial<MaterialPreset> & Pick<MaterialPreset, 'id'>): MaterialPreset {
  return {
    name: 'Test',
    source: 'user',
    kind: 'textured',
    ...partial,
  };
}

describe('migrateMaterialPreset', () => {
  it('maps legacy concrete-porous profile to concrete-stained for user copies', () => {
    const preset = userPreset({
      id: 'user-abc',
      proceduralProfile: 'concrete-porous',
    });
    expect(migrateMaterialPreset(preset).proceduralProfile).toBe('concrete-stained');
  });

  it('keeps concrete-porous on the porous builtin', () => {
    const preset = userPreset({
      id: MATERIAL_CONCRETE_POROUS_ID,
      proceduralProfile: 'concrete-porous',
    });
    expect(migrateMaterialPreset(preset).proceduralProfile).toBe('concrete-porous');
  });
});
