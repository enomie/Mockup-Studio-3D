import { describe, expect, it } from 'vitest';
import { DoubleSide, MeshPhysicalNodeMaterial } from 'three/webgpu';
import { MATERIAL_PRESETS } from '@/data/material-presets';
import { createMaterialFromPreset } from '@/engine/material-resolver';
import {
  MATERIAL_PAINT_METALLIC_ID,
  MATERIAL_WIREFRAME_ID,
  MATERIAL_ZEBRA_ANALYSIS_ID,
} from '@/scene/material-ids';

function presetById(id: string) {
  const preset = MATERIAL_PRESETS.find((entry) => entry.id === id);
  if (!preset) {throw new Error(`missing preset ${id}`);}
  return preset;
}

describe('analysis and paint materials', () => {
  it('registers the three new built-in presets', () => {
    expect(presetById(MATERIAL_PAINT_METALLIC_ID).kind).toBe('solid-pbr');
    expect(presetById(MATERIAL_ZEBRA_ANALYSIS_ID).analysisMode).toBe('zebra');
    expect(presetById(MATERIAL_WIREFRAME_ID).analysisMode).toBe('wireframe');
  });

  it('builds Paint Metallic as clearcoated physical material', () => {
    const material = createMaterialFromPreset(presetById(MATERIAL_PAINT_METALLIC_ID));
    expect(material).toBeInstanceOf(MeshPhysicalNodeMaterial);
    expect((material as MeshPhysicalNodeMaterial).clearcoat).toBe(1);
  });

  it('builds unlit zebra and wireframe materials', () => {
    const zebra = createMaterialFromPreset(presetById(MATERIAL_ZEBRA_ANALYSIS_ID));
    const wire = createMaterialFromPreset(presetById(MATERIAL_WIREFRAME_ID));
    expect(zebra.outputNode).toBeTruthy();
    expect(zebra.wireframe).toBe(false);
    expect(wire.outputNode).toBeTruthy();
    expect(wire.wireframe).toBe(true);
    expect(wire.side).toBe(DoubleSide);
  });
});
