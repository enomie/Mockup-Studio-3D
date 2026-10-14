import type { LineSegments, SpotLight } from 'three/webgpu';
import { VIEWPORT_SPOT_BEAM_DISPLAY_DISTANCE_M } from '@/constants';

/** Length SpotLightHelper uses when `light.distance === 0`. */
export const SPOT_LIGHT_HELPER_FALLBACK_DISTANCE_M = 1000;

export function spotBeamHelperConeLengthM(light: SpotLight): number {
  return light.distance > 0 ? light.distance : SPOT_LIGHT_HELPER_FALLBACK_DISTANCE_M;
}

/** Scale helper cone to a fixed display length after `SpotLightHelper.update()`. */
export function applySpotBeamDisplayScale(cone: LineSegments, light: SpotLight): void {
  const coneLength = spotBeamHelperConeLengthM(light);
  const factor = VIEWPORT_SPOT_BEAM_DISPLAY_DISTANCE_M / coneLength;
  cone.scale.multiplyScalar(factor);
}
