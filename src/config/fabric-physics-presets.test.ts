import { describe, expect, it } from 'vitest';
import {
  createDefaultFabricClothPhysicsParams,
  FABRIC_PHYSICS_PRESET_KEYS,
  FABRIC_PHYSICS_PRESETS,
  fabricClothPhysicsParamsFromMaterialId,
  fabricClothPhysicsParamsFromPresetKey,
  fabricClothPhysicsWithCustomScalar,
} from './fabric-physics-presets';

describe('fabricPhysicsPresets', () => {
  it('exposes Silk preset keys', () => {
    expect(FABRIC_PHYSICS_PRESET_KEYS).toEqual(['silk', 'satin', 'linen', 'chiffon']);
    expect(FABRIC_PHYSICS_PRESETS.silk.gravity).toBe(4.2);
  });

  it('default physics matches silk preset', () => {
    const defaults = createDefaultFabricClothPhysicsParams();
    const silk = fabricClothPhysicsParamsFromPresetKey('silk');
    expect(defaults).toEqual(silk);
    expect(defaults.solverIterations).toBe(5);
  });

  it('fabricClothPhysicsWithCustomScalar sets custom preset', () => {
    const silk = fabricClothPhysicsParamsFromPresetKey('silk');
    const tuned = fabricClothPhysicsWithCustomScalar(silk, 'gravityMagnitude', 9);
    expect(tuned.activePreset).toBe('custom');
    expect(tuned.gravityMagnitude).toBe(9);
    expect(tuned.damping).toBe(silk.damping);
  });

  it('maps material ids to initial physics presets', () => {
    expect(fabricClothPhysicsParamsFromMaterialId('material-silk').activePreset).toBe('silk');
    expect(fabricClothPhysicsParamsFromMaterialId('material-fabric').activePreset).toBe('linen');
    expect(fabricClothPhysicsParamsFromMaterialId('material-chrome').activePreset).toBe('linen');
  });
});
