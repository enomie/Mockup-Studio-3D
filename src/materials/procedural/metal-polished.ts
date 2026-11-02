import {
  bumpMap,
  clamp,
  float,
  mx_noise_float,
  vec2,
  vec3,
} from 'three/tsl';
import { meterPositionLocal } from './procedural-position';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import {
  ROUGHNESS_MIN,
  type ProceduralMaterialNodes,
  type ProceduralMaterialParams,
} from './procedural-types';

export function buildMetalPolishedNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const noiseCoord =
    params.samplingSpace === 'meter-3d'
      ? meterPositionLocal(params.tileScale, params.seed)
      : (() => {
          const seedOffset = vec2(seed.mul(13.1), seed.mul(27.7));
          const sampleUv = buildProceduralSampleUv(params).add(seedOffset);
          return vec3(sampleUv.x, sampleUv.y, seed);
        })();

  const micro = mx_noise_float(noiseCoord.mul(48)).mul(0.06);

  const colorNode = params.uniforms.color;

  const bumpStrength = float(params.normalScale * 0.03);
  const height = micro.add(0.5);
  const normalNode = bumpMap(height, bumpStrength);

  const roughBase = params.uniforms.roughness;
  const roughnessNode = clamp(
    roughBase.add(mx_noise_float(noiseCoord.mul(32).add(vec3(seed.add(3), 0, 0))).mul(0.015)),
    ROUGHNESS_MIN,
    1,
  );

  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}
