import { describe, expect, it } from 'vitest';
import { LineSegments, SpotLight } from 'three/webgpu';
import { VIEWPORT_SPOT_BEAM_DISPLAY_DISTANCE_M } from '@/constants';
import {
  applySpotBeamDisplayScale,
  SPOT_LIGHT_HELPER_FALLBACK_DISTANCE_M,
  spotBeamHelperConeLengthM,
} from './spot-beam-display';

describe('spot-beam-display', () => {
  it('uses fallback length when distance is zero', () => {
    const light = new SpotLight(0xffffff, 1, 0, Math.PI / 4, 0.5, 1);
    expect(spotBeamHelperConeLengthM(light)).toBe(SPOT_LIGHT_HELPER_FALLBACK_DISTANCE_M);
    light.dispose();
  });

  it('scales cone uniformly to display distance', () => {
    const light = new SpotLight(0xffffff, 1, 0, Math.PI / 4, 0.5, 1);
    const cone = new LineSegments();
    cone.scale.set(2, 2, SPOT_LIGHT_HELPER_FALLBACK_DISTANCE_M);
    applySpotBeamDisplayScale(cone, light);
    expect(cone.scale.z).toBe(VIEWPORT_SPOT_BEAM_DISPLAY_DISTANCE_M);
    expect(cone.scale.x).toBe(2 * (VIEWPORT_SPOT_BEAM_DISPLAY_DISTANCE_M / 1000));
    light.dispose();
  });
});
