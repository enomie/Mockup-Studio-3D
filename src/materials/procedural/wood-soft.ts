import {
  bumpMap,
  clamp,
  float,
  fract,
  mix,
  mx_noise_float,
  smoothstep,
  vec2,
  vec3,
} from 'three/tsl';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';

/** Softwood grain — subtle rings and pores (spruce-like). */
export function buildWoodSoftNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const seedOffset = vec2(seed.mul(17.3), seed.mul(31.7));
  const sampleUv = buildProceduralSampleUv(params).add(seedOffset);

  const warpX = mx_noise_float(vec3(sampleUv.x.mul(1.4), sampleUv.y.mul(0.5), seed)).mul(0.4);
  const warpY = mx_noise_float(
    vec3(sampleUv.x.mul(0.6), sampleUv.y.mul(1.1), seed.add(4.2)),
  ).mul(0.2);
  const warped = vec2(sampleUv.x.add(warpX), sampleUv.y.add(warpY));

  const ringWarp = mx_noise_float(vec3(warped.mul(2.5), seed.add(8.1))).mul(0.28);
  const grainLine = warped.x.mul(float(5.5)).add(ringWarp);
  const rings = fract(grainLine);

  const band = smoothstep(float(0.12), float(0.38), rings).mul(
    smoothstep(float(0.88), float(0.52), rings),
  );

  const pores = mx_noise_float(vec3(sampleUv.mul(22), seed.add(12.5)))
    .sub(0.5)
    .mul(0.18);

  const grain = clamp(band.mul(0.82).add(pores).add(0.08), 0, 1);

  const albedoMod = mix(float(0.62), float(1.12), grain);
  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(albedoMod);

  const bumpStrength = float(params.normalScale * 0.14);
  const normalNode = bumpMap(grain, bumpStrength);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(
    roughBase
      .sub(grain.mul(0.12))
      .add(mx_noise_float(vec3(sampleUv.mul(8), seed)).mul(0.04)),
    0.28,
    0.72,
  );

  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}
