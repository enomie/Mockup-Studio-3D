import { describe, expect, it } from 'vitest';
import { MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, Texture } from 'three/webgpu';
import { MATERIAL_PRESETS } from '@/data/material-presets';
import {
  MATERIAL_ALUMINUM_BRUSHED_ID,
  MATERIAL_GLASS_WINE_BOTTLE_ID,
  MATERIAL_GLOSSY_PRINT_ID,
  MATERIAL_PAPER_ID,
  MATERIAL_PLASTIC_MATTE_ID,
} from '@/scene/material-ids';
import { DEFAULT_IMAGE_SURFACE } from '@/scene/image-surface';
import { createMaterialFromPreset } from './material-resolver';
import { rotationalPrintFit } from './rotational-print-mapping';
import {
  createRotationalPrintMaterial,
  updateRotationalPrintMaterial,
} from './rotational-print-material';

function presetById(id: string) {
  const preset = MATERIAL_PRESETS.find((entry) => entry.id === id);
  if (!preset) {
    throw new Error(`Missing preset: ${id}`);
  }
  return preset;
}

function build(baseId: string, finish: 'matt' | 'glossy', substrate: number) {
  const baseMaterial = createMaterialFromPreset(presetById(baseId), {
    surfaceRole: 'frame',
    grainAlongU: true,
  });
  return {
    baseMaterial,
    material: createRotationalPrintMaterial({
      baseMaterial,
      texture: new Texture(),
      fit: rotationalPrintFit('wrap-width', 0.2, 0.1, 2000, 1000),
      surface: { ...DEFAULT_IMAGE_SURFACE, finish },
      mattPreset: presetById(MATERIAL_PAPER_ID),
      glossyPreset: presetById(MATERIAL_GLOSSY_PRINT_ID),
      settings: { substrate, inkOpacity: 1, gloss: finish === 'glossy' ? 1 : 0 },
    }),
  };
}

describe('createRotationalPrintMaterial', () => {
  it('upgrades a solid standard base to physical and wraps all print nodes', () => {
    const base = createMaterialFromPreset(presetById(MATERIAL_PLASTIC_MATTE_ID));
    expect(base).toBeInstanceOf(MeshStandardNodeMaterial);
    const { material } = build(MATERIAL_PLASTIC_MATTE_ID, 'glossy', 0);
    expect(material).toBeInstanceOf(MeshPhysicalNodeMaterial);
    expect(material.colorNode).not.toBeNull();
    expect(material.roughnessNode).not.toBeNull();
    expect(material.metalnessNode).not.toBeNull();
    expect(material.clearcoatNode).not.toBeNull();
    expect(material.transmissionNode).toBeNull();
  });

  it('keeps a procedural base material and wraps its nodes (brushed aluminum)', () => {
    const { baseMaterial, material } = build(MATERIAL_ALUMINUM_BRUSHED_ID, 'matt', 1);
    expect(material).toBe(baseMaterial);
    expect(material.colorNode).not.toBeNull();
    expect(material.transmissionNode).toBeNull();
  });

  it('adds transmission and opacity control on glass, keeping render state', () => {
    const glass = createMaterialFromPreset(presetById(MATERIAL_GLASS_WINE_BOTTLE_ID));
    const depthWrite = glass.depthWrite;
    const side = glass.side;
    const { material } = build(MATERIAL_GLASS_WINE_BOTTLE_ID, 'matt', 0);
    expect(material.transmissionNode).not.toBeNull();
    expect(material.opacityNode).not.toBeNull();
    expect(material.depthWrite).toBe(depthWrite);
    expect(material.side).toBe(side);
  });

  it('updates slider values in place through uniforms', () => {
    const { material } = build(MATERIAL_PLASTIC_MATTE_ID, 'matt', 0);
    expect(updateRotationalPrintMaterial(material, { substrate: 0.7, inkOpacity: 0.5, gloss: 1 })).toBe(true);
    const uniforms = material.userData.rotationalPrintUniforms as Record<string, { value: number }>;
    expect(uniforms.substrate.value).toBeCloseTo(0.7, 6);
    expect(uniforms.inkOpacity.value).toBeCloseTo(0.5, 6);
    expect(uniforms.gloss.value).toBe(1);
    expect(updateRotationalPrintMaterial(new MeshStandardNodeMaterial(), {
      substrate: 0, inkOpacity: 1, gloss: 0,
    })).toBe(false);
  });

  it('only sets emissive when the surface asks for it', () => {
    expect(build(MATERIAL_PLASTIC_MATTE_ID, 'matt', 0.5).material.emissiveNode).toBeNull();
  });
});
