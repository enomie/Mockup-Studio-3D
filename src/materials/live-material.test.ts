import { describe, expect, it } from 'vitest';
import type { MeshPhysicalNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu';
import { MATERIAL_PRESETS } from '@/data/material-presets';
import { createMaterialFromPreset, MaterialResolver } from '@/engine/material-resolver';
import type { MaterialPreset } from '@/scene/material-types';
import {
  applyLivePreset,
  isLiveMaterial,
  isNameOnlyPresetChange,
  isStructuralPresetChange,
  liveMaterialCount,
} from './live-material';

function preset(partial: Partial<MaterialPreset>): MaterialPreset {
  return {
    id: `user-${Math.random().toString(36).slice(2)}`,
    name: 'Test',
    source: 'user',
    kind: 'solid-pbr',
    color: { r: 0.5, g: 0.5, b: 0.5 },
    roughness: 0.5,
    metalness: 0,
    ...partial,
  };
}

function builtin(id: string): MaterialPreset {
  const found = MATERIAL_PRESETS.find((entry) => entry.id === id);
  if (!found) {throw new Error(id);}
  return found;
}

describe('isStructuralPresetChange', () => {
  const base = preset({});

  it('treats color, roughness and metalness as values', () => {
    expect(isStructuralPresetChange(base, { ...base, color: { r: 1, g: 0, b: 0 } })).toBe(false);
    expect(isStructuralPresetChange(base, { ...base, roughness: 0.2 })).toBe(false);
    expect(isStructuralPresetChange(base, { ...base, metalness: 0.3 })).toBe(false);
  });

  it('treats pattern, relief and profile as structural', () => {
    const wood = preset({ kind: 'textured', proceduralProfile: 'wood-soft' });
    expect(isStructuralPresetChange(wood, { ...wood, tileScale: 3 })).toBe(true);
    expect(isStructuralPresetChange(wood, { ...wood, normalScale: 0.2 })).toBe(true);
    expect(isStructuralPresetChange(wood, { ...wood, seed: 4 })).toBe(true);
    expect(isStructuralPresetChange(wood, { ...wood, proceduralProfile: 'wood-porous' })).toBe(true);
  });

  it('treats a feature switching on or off as structural, its amount as value', () => {
    expect(isStructuralPresetChange(base, { ...base, clearcoat: 0.4 })).toBe(true);
    const coated = { ...base, clearcoat: 0.4 };
    expect(isStructuralPresetChange(coated, { ...coated, clearcoat: 0.8 })).toBe(false);
  });

  it('flags clear/frosted glass switches', () => {
    const glass = preset({ kind: 'transmission', roughness: 0.02 });
    expect(isStructuralPresetChange(glass, { ...glass, roughness: 0.05 })).toBe(false);
    expect(isStructuralPresetChange(glass, { ...glass, roughness: 0.4 })).toBe(true);
  });

  it('detects name-only edits', () => {
    expect(isNameOnlyPresetChange(base, { ...base, name: 'Other' })).toBe(true);
    expect(isNameOnlyPresetChange(base, { ...base, roughness: 0.1 })).toBe(false);
  });
});

describe('live material updates', () => {
  it('updates solid PBR values in place', () => {
    const p = preset({});
    const material = createMaterialFromPreset(p);
    expect(isLiveMaterial(material)).toBe(true);
    applyLivePreset({ ...p, color: { r: 1, g: 0, b: 0 }, roughness: 0.2, metalness: 0.7 });
    expect(material.color.r).toBeCloseTo(1);
    expect(material.color.g).toBeCloseTo(0);
    expect(material.roughness).toBeCloseTo(0.2);
    expect(material.metalness).toBeCloseTo(0.7);
  });

  it('keeps the tint when applying a new color', () => {
    const p = preset({});
    const material = createMaterialFromPreset(p, { tint: { r: 0.5, g: 1, b: 1 } });
    applyLivePreset({ ...p, color: { r: 1, g: 1, b: 1 } });
    expect(material.color.r).toBeCloseTo(0.5);
    expect(material.color.g).toBeCloseTo(1);
  });

  it('updates procedural uniforms and physical values', () => {
    const p = { ...builtin('material-wood'), id: 'user-live-wood' };
    const material = createMaterialFromPreset(p) as MeshPhysicalNodeMaterial;
    applyLivePreset({ ...p, clearcoat: 0.5, metalness: 0.2 });
    expect(material.clearcoat).toBeCloseTo(0.5);
    expect(material.metalness).toBeCloseTo(0.2);
  });

  it('updates glass tint, roughness and IOR', () => {
    const p = { ...builtin('material-glass-solid'), id: 'user-live-glass' };
    const material = createMaterialFromPreset(p) as MeshPhysicalNodeMaterial;
    applyLivePreset({ ...p, ior: 1.9, roughness: 0.04, tint: { r: 0.2, g: 1, b: 1 } });
    expect(material.ior).toBeCloseTo(1.9);
    expect(material.roughness).toBeCloseTo(0.04);
    expect(material.color.r).toBeCloseTo(0.2);
  });

  it('unregisters on dispose and for uncached (rewired) materials', () => {
    const p = preset({});
    const material = createMaterialFromPreset(p);
    expect(liveMaterialCount(p.id)).toBe(1);
    material.dispose();
    expect(liveMaterialCount(p.id)).toBe(0);

    const resolver = new MaterialResolver();
    resolver.setPresetResolver((id) => (id === p.id ? p : null));
    const uncached = resolver.createUncached(p.id);
    expect(uncached).not.toBeNull();
    expect(isLiveMaterial(uncached as MeshStandardNodeMaterial)).toBe(false);
  });
});
