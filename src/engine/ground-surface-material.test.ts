import { describe, expect, it } from 'vitest';
import {
  MATERIAL_GLASS_PANE_ID,
  MATERIAL_GOLD_BRUSHED_ID,
  MATERIAL_PAPER_ID,
} from '@/scene/material-ids';
import { resolveBuiltinMaterialPreset } from '@/data/material-presets';
import { createGroundSurfaceMaterial } from './material-resolver';

describe('createGroundSurfaceMaterial', () => {
  it('renders transmission presets as opaque solid', () => {
    const preset = resolveBuiltinMaterialPreset(MATERIAL_GLASS_PANE_ID);
    expect(preset).not.toBeNull();
    const material = createGroundSurfaceMaterial(preset!);
    expect(material.transparent).not.toBe(true);
    expect(material.opacity).toBe(1);
    material.dispose();
  });

  it('builds textured Print Matt for ground', () => {
    const preset = resolveBuiltinMaterialPreset(MATERIAL_PAPER_ID);
    expect(preset).not.toBeNull();
    const material = createGroundSurfaceMaterial(preset!);
    expect(material.colorNode).toBeDefined();
    material.dispose();
  });

  it('builds textured Wood Soft and brushed metal for ground', () => {
    for (const id of ['material-wood', MATERIAL_GOLD_BRUSHED_ID]) {
      const preset = resolveBuiltinMaterialPreset(id);
      expect(preset).not.toBeNull();
      const material = createGroundSurfaceMaterial(preset!);
      expect(material.colorNode).toBeDefined();
      material.dispose();
    }
  });
});
