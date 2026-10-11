import { float, positionLocal, vec2 } from 'three/tsl';
import { buildGrainSampleUv } from './procedural-grain-uv';
import type { ProceduralMaterialParams } from './procedural-types';

/**
 * Build tiled sample coordinates for procedural profiles.
 * - planar-meters: positionLocal.xy in scene meters (print sides, ground plane, thin panels)
 * - uv: mesh UVs with grain along U or V (frame perimeter UVs in meters)
 */
export function buildProceduralSampleUv(params: ProceduralMaterialParams) {
  const scale = float(params.tileScale);

  if (params.samplingSpace === 'planar-meters') {
    return vec2(positionLocal.x, positionLocal.y).mul(scale);
  }

  return buildGrainSampleUv(params.tileScale, params.grainAlongU);
}
