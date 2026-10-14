import { describe, expect, it } from 'vitest';
import { DoubleSide, Texture } from 'three/webgpu';
import { MATERIAL_PRESETS } from '@/data/material-presets';
import { MATERIAL_FABRIC_ID } from '@/scene/material-ids';
import { defaultFabricClothParams } from '@/scene/asset-fabric-cloth';
import { createFabricClothMaterial } from './fabric-cloth-material';

function presetById(id: string) {
  const preset = MATERIAL_PRESETS.find((entry) => entry.id === id);
  if (!preset) {
    throw new Error(`Missing preset: ${id}`);
  }
  return preset;
}

const resolvePreset = (id: string) => presetById(id);

describe('createFabricClothMaterial', () => {
  it('uses DoubleSide when no image texture (placeholder)', () => {
    const material = createFabricClothMaterial(
      resolvePreset,
      MATERIAL_FABRIC_ID,
      null,
      0.45,
      0.45,
      defaultFabricClothParams(),
    );

    expect(material.side).toBe(DoubleSide);
    material.dispose();
  });

  it('uses DoubleSide when image texture is set', () => {
    const tex = new Texture();
    const material = createFabricClothMaterial(
      resolvePreset,
      MATERIAL_FABRIC_ID,
      tex,
      0.45,
      0.3,
      defaultFabricClothParams(),
      1000,
      800,
      'sample.png',
    );

    expect(material.side).toBe(DoubleSide);
    material.dispose();
    tex.dispose();
  });
});
