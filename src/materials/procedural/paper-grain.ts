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

/**
 * Paper grain — samples in local plane meters (positionLocal.xy).
 * tileScale = repeats per meter (~400 → ~2.5 mm period).
 */
export function buildPaperGrainNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const seedOffset = vec2(seed.mul(11.3), seed.mul(23.9));
  const sampleUv = buildProceduralSampleUv(params).add(seedOffset);

  const fiberStreaks = mx_noise_float(
    vec3(sampleUv.x.mul(0.25), sampleUv.y.mul(6), seed),
  )
    .sub(0.5)
    .mul(0.04);

  const micro = mx_noise_float(vec3(sampleUv.mul(vec2(72, 96)), seed.add(5.1)))
    .sub(0.5)
    .mul(0.035);

  const grain = clamp(fiberStreaks.add(micro).add(0.5), 0, 1);

  const albedoMod = float(1).add(grain.sub(0.5).mul(0.08));
  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(albedoMod);

  const bumpStrength = float(params.normalScale * 0.025);
  const normalNode = bumpMap(grain, bumpStrength);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(
    roughBase.add(grain.sub(0.5).mul(0.03)).add(
      mx_noise_float(vec3(sampleUv.mul(40), seed.add(2.3))).mul(0.012),
    ),
    0.75,
    1,
  );

  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}
