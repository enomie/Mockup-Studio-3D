import { describe, expect, it } from 'vitest';
import { DoubleSide, MeshPhysicalNodeMaterial, Texture } from 'three/webgpu';
import {
  MATERIAL_GLASS_FROSTED_PANE_ID,
  MATERIAL_GLASS_PANE_ID,
  MATERIAL_GLASS_SOLID_ID,
  MATERIAL_GLASS_WINE_BOTTLE_ID,
} from '@/scene/material-ids';
import { MATERIAL_PRESETS } from '@/data/material-presets';
import {
  createImagePbrMaterial,
  createMaterialFromPreset,
  createPassepartoutPbrMaterial,
  createTransmissionMaterial,
  isClearTransmissionPreset,
} from './material-resolver';
import { resolveImageSurfaceSettings } from '@/scene/image-surface';
import { WINE_BOTTLE_GLASS_TRANSMISSION_MESH_DEPTH_FACTOR } from '@/scene/asset-wine-bottle';

function presetById(id: string) {
  const preset = MATERIAL_PRESETS.find((entry) => entry.id === id);
  if (!preset) {
    throw new Error(`Missing preset: ${id}`);
  }
  return preset;
}

const resolvePreset = (id: string) => presetById(id);

describe('createMaterialFromPreset — display glazing', () => {
  it('routes clear pane on displayGlass to non-transmission glazing', () => {
    const material = createMaterialFromPreset(presetById(MATERIAL_GLASS_PANE_ID), {
      surfaceRole: 'displayGlass',
      meshDepthM: 0.001,
    }) as MeshPhysicalNodeMaterial;

    expect(material).toBeInstanceOf(MeshPhysicalNodeMaterial);
    expect(material.transmission).toBe(0);
    expect(material.clearcoat).toBe(1);
    expect(material.opacity).toBe(0.04);
    expect(material.depthWrite).toBe(true);
  });

  it('keeps frosted pane on displayGlass as transmission', () => {
    const material = createMaterialFromPreset(
      presetById(MATERIAL_GLASS_FROSTED_PANE_ID),
      {
        surfaceRole: 'displayGlass',
        meshDepthM: 0.001,
      },
    ) as MeshPhysicalNodeMaterial;

    expect(material).toBeInstanceOf(MeshPhysicalNodeMaterial);
    expect(material.transmission).toBe(1);
    expect(material.roughness).toBe(0.35);
    expect(material.thickness).toBe(0.001);
    expect(material.depthWrite).toBe(true);
  });

  it('keeps clear solid glass as transmission when not display glazing', () => {
    const material = createMaterialFromPreset(presetById(MATERIAL_GLASS_SOLID_ID), {
      meshDepthM: 0.012,
    }) as MeshPhysicalNodeMaterial;

    expect(material).toBeInstanceOf(MeshPhysicalNodeMaterial);
    expect(material.transmission).toBe(1);
    expect(material.thickness).toBe(0.012);
  });

  it('wine bottle optical mesh depth factor scales default wall thickness', () => {
    expect(WINE_BOTTLE_GLASS_TRANSMISSION_MESH_DEPTH_FACTOR).toBe(0.4);
    expect(0.0025 * WINE_BOTTLE_GLASS_TRANSMISSION_MESH_DEPTH_FACTOR).toBeCloseTo(0.001, 6);
  });

  it('wine bottle glass uses transmission with wall thickness and green tint', () => {
    expect(MATERIAL_PRESETS.some((entry) => entry.id === MATERIAL_GLASS_WINE_BOTTLE_ID)).toBe(
      true,
    );

    const material = createMaterialFromPreset(presetById(MATERIAL_GLASS_WINE_BOTTLE_ID), {
      meshDepthM: 0.0025,
    }) as MeshPhysicalNodeMaterial;

    expect(material.transmission).toBe(1);
    expect(material.thickness).toBe(0.0025);
    expect(material.color.r).toBeCloseTo(23 / 255, 5);
    expect(material.color.g).toBeCloseTo(97 / 255, 5);
    expect(material.color.b).toBeCloseTo(50 / 255, 5);
    expect(isClearTransmissionPreset(presetById(MATERIAL_GLASS_WINE_BOTTLE_ID))).toBe(true);
    expect(material.attenuationDistance).toBe(0.015);
    expect(material.attenuationColor.r).toBeCloseTo(23 / 255, 5);
    const specularScale = 2.25;
    expect(material.specularColor.r).toBeCloseTo(Math.min(1, (23 / 255) * specularScale), 4);
    expect(material.specularColor.g).toBeCloseTo(Math.min(1, (97 / 255) * specularScale), 4);
    expect(material.specularColor.b).toBeCloseTo(Math.min(1, (50 / 255) * specularScale), 4);
    expect(material.specularColor.r).toBeLessThan(1);
  });

  it('wine bottle preset glass is double-sided without depth write', () => {
    const material = createMaterialFromPreset(presetById(MATERIAL_GLASS_WINE_BOTTLE_ID), {
      meshDepthM: 0.0025,
    }) as MeshPhysicalNodeMaterial;

    expect(material.side).toBe(DoubleSide);
    expect(material.depthWrite).toBe(false);
    expect(material.transmission).toBe(1);
    expect(material.shadowSide).toBe(DoubleSide);
  });

  it('wine bottle glass stays transmission on displayGlass role (not display glazing)', () => {
    const material = createMaterialFromPreset(presetById(MATERIAL_GLASS_WINE_BOTTLE_ID), {
      surfaceRole: 'displayGlass',
      meshDepthM: 0.0025,
    }) as MeshPhysicalNodeMaterial;

    expect(material.transmission).toBe(1);
    expect(material.clearcoat).not.toBe(1);
  });
});

describe('isClearTransmissionPreset', () => {
  it('treats pane and solid clear presets as clear', () => {
    expect(isClearTransmissionPreset(presetById(MATERIAL_GLASS_PANE_ID))).toBe(true);
    expect(isClearTransmissionPreset(presetById(MATERIAL_GLASS_SOLID_ID))).toBe(true);
    expect(
      isClearTransmissionPreset(presetById(MATERIAL_GLASS_FROSTED_PANE_ID)),
    ).toBe(false);
  });
});

describe('createImagePbrMaterial — emissive', () => {
  it('sets emissiveNode when emissive is enabled', () => {
    const surface = resolveImageSurfaceSettings(undefined, 'front', {
      assetKind: 'picture',
    });
    const material = createImagePbrMaterial(
      resolvePreset,
      { ...surface, emissiveEnabled: true, emissiveIntensity: 0.8 },
      new Texture(),
      1,
      1,
      100,
      100,
    );

    expect(material.emissiveNode).toBeDefined();
  });

  it('skips emissiveNode when emissive is disabled', () => {
    const surface = resolveImageSurfaceSettings(undefined, 'front', {
      assetKind: 'picture',
    });
    const material = createImagePbrMaterial(
      resolvePreset,
      surface,
      new Texture(),
      1,
      1,
      100,
      100,
    );

    expect(material.emissiveNode).toBeFalsy();
  });
});

describe('createImagePbrMaterial — alpha', () => {
  it('enables transparent blend for png file names', () => {
    const surface = resolveImageSurfaceSettings(undefined, 'front', {
      assetKind: 'picture',
    });
    const material = createImagePbrMaterial(
      resolvePreset,
      surface,
      new Texture(),
      1,
      1,
      100,
      100,
      undefined,
      'label-F-blue-transparent-square.png',
    );

    expect(material.transparent).toBe(true);
    expect(material.opacityNode).toBeDefined();
    expect(material.depthWrite).toBe(false);
  });

  it('stays opaque for jpeg file names', () => {
    const surface = resolveImageSurfaceSettings(undefined, 'front', {
      assetKind: 'picture',
    });
    const material = createImagePbrMaterial(
      resolvePreset,
      surface,
      new Texture(),
      1,
      1,
      100,
      100,
      undefined,
      'sample-landscape.jpg',
    );

    expect(material.transparent).not.toBe(true);
    expect(material.opacityNode).toBeFalsy();
    expect(material.depthWrite).toBe(true);
  });
});

describe('createPassepartoutPbrMaterial', () => {
  it('builds a solid passepartout material', () => {
    const surface = resolveImageSurfaceSettings(undefined, 'front', {
      assetKind: 'picture',
    });
    const material = createPassepartoutPbrMaterial(resolvePreset, surface);

    expect(material.colorNode).toBeDefined();
    expect(material.roughnessNode).toBeDefined();
  });
});

describe('createTransmissionMaterial — glazing cap', () => {
  it('enables depthWrite on frosted glazing caps', () => {
    const material = createTransmissionMaterial(
      presetById(MATERIAL_GLASS_FROSTED_PANE_ID),
      { surfaceRole: 'displayGlass', meshDepthM: 0.002 },
    );

    expect(material.depthWrite).toBe(true);
    expect(material.transmission).toBe(1);
  });
});
