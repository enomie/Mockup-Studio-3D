import {
  bumpMap,
  clamp,
  float,
  mx_noise_float,
  vec2,
  vec3,
} from 'three/tsl';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';

export function buildMetalPolishedNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const seedOffset = vec2(seed.mul(13.1), seed.mul(27.7));
  const sampleUv = buildProceduralSampleUv(params).add(seedOffset);

  const micro = mx_noise_float(vec3(sampleUv.mul(48), seed))
    .sub(0.5)
    .mul(0.06);

  const colorNode = vec3(params.color.r, params.color.g, params.color.b);

  const bumpStrength = float(params.normalScale * 0.03);
  const height = micro.add(0.5);
  const normalNode = bumpMap(height, bumpStrength);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(
    roughBase.add(mx_noise_float(vec3(sampleUv.mul(32), seed.add(3))).mul(0.015)),
    0.02,
    0.2,
  );

  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}
