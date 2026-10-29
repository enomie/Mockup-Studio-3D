import { describe, expect, it } from 'vitest';
import { DoubleSide, MeshPhysicalNodeMaterial, Texture } from 'three/webgpu';
import { MATERIAL_PRESETS } from '@/data/material-presets';
import { MATERIAL_ALUMINUM_BRUSHED_ID, MATERIAL_FABRIC_ID } from '@/scene/material-ids';
import { clampFabricClothParams, defaultFabricClothParams } from '@/scene/asset-fabric-cloth';
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
    expect(material.positionNode).toBeDefined();
    expect(material.depthWrite).toBe(true);
    expect(material.transparent).toBe(false);
    material.dispose();
  });

  it('applies fabricClothMaterialId preset when no image (Aluminum Brushed)', () => {
    const brushed = presetById(MATERIAL_ALUMINUM_BRUSHED_ID);
    const material = createFabricClothMaterial(
      resolvePreset,
      MATERIAL_ALUMINUM_BRUSHED_ID,
      null,
      0.45,
      0.45,
      defaultFabricClothParams(),
    );

    expect(material).toBeInstanceOf(MeshPhysicalNodeMaterial);
    expect(material.side).toBe(DoubleSide);
    if (material instanceof MeshPhysicalNodeMaterial) {
      expect(material.anisotropy).toBe(brushed.anisotropy);
    }
    expect(material.colorNode).toBeDefined();
    expect(material.roughnessNode).toBeDefined();
    expect(material.metalnessNode).toBeDefined();
    material.dispose();
  });

  it('applies border colorNode mix when border enabled without image', () => {
    const params = clampFabricClothParams(
      { borderEnabled: true },
      defaultFabricClothParams(),
    );
    const material = createFabricClothMaterial(
      resolvePreset,
      MATERIAL_ALUMINUM_BRUSHED_ID,
      null,
      0.45,
      0.45,
      params,
    );

    expect(material.colorNode).toBeDefined();
    expect(material.roughnessNode).toBeDefined();
    expect(material.positionNode).toBeDefined();
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
    expect(material.positionNode).toBeDefined();
    expect(material.depthWrite).toBe(true);
    expect(material.transparent).toBe(false);
    expect(material.alphaTest).toBe(0.5);
    material.dispose();
    tex.dispose();
  });

  it('applies border nodes and cutout opacity when border enabled with PNG', () => {
    const tex = new Texture();
    const params = clampFabricClothParams(
      { borderEnabled: true },
      defaultFabricClothParams(),
    );
    const material = createFabricClothMaterial(
      resolvePreset,
      MATERIAL_FABRIC_ID,
      tex,
      0.45,
      0.3,
      params,
      1000,
      800,
      'sample.png',
    );

    expect(material.colorNode).toBeDefined();
    expect(material.opacityNode).toBeDefined();
    expect(material.positionNode).toBeDefined();
    expect(material.alphaTest).toBe(0.5);
    material.dispose();
    tex.dispose();
  });
});
