import { describe, expect, it } from 'vitest';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { MATERIAL_PAPER_ID } from './material-ids';
import { normalizeGroundSettings } from './ground-settings';

describe('normalizeGroundSettings', () => {
  it('defaults to Print Matt when materialId is missing', () => {
    const legacy = {
      visible: true,
      color: { r: 0.79, g: 0.66, b: 0.49 },
      roughness: 0.92,
      metalness: 0,
      opacity: 0.5,
      receiveShadow: true,
      emissiveColor: { r: 1, g: 0, b: 0 },
      emissiveIntensity: 0.2,
      mirrorEnabled: false,
      mirrorOpacity: 1,
    };

    expect(normalizeGroundSettings(legacy)).toEqual({
      visible: true,
      materialId: MATERIAL_PAPER_ID,
      receiveShadow: true,
      mirrorEnabled: false,
      mirrorOpacity: 1,
    });
  });

  it('preserves current ground defaults shape', () => {
    expect(normalizeGroundSettings(SCENE_DEFAULTS.ground)).toEqual(
      SCENE_DEFAULTS.ground,
    );
  });
});
