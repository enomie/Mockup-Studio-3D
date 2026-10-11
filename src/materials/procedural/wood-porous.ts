import {
  bumpMap,
  clamp,
  float,
  mx_noise_float,
  smoothstep,
  vec2,
  vec3,
} from 'three/tsl';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';

/**
 * Noise scale on stretched UV. With tileScale ≈ 6 on frame perimeter UVs (meters),
 * ~34 → ~12 mm center-to-center along grain; spot diameter ~0.6–1.0 mm (narrow smoothstep).
 */
const PORE_NOISE_SCALE = 34;
const PORE_STRETCH_ALONG_GRAIN = 0.4;
const PORE_STRETCH_ACROSS_GRAIN = 2.4;

/** Porous wood — small elongated dark spots only, no growth rings. */
export function buildWoodPorousNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const seedOffset = vec2(seed.mul(19.1), seed.mul(29.3));
  const sampleUv = buildProceduralSampleUv(params).add(seedOffset);

  const stretched = vec2(
    sampleUv.x.mul(float(PORE_STRETCH_ALONG_GRAIN)),
    sampleUv.y.mul(float(PORE_STRETCH_ACROSS_GRAIN)),
  );
  const poreNoise = mx_noise_float(vec3(stretched.mul(float(PORE_NOISE_SCALE)), seed.add(6.4)));

  const spotMask = smoothstep(float(0.56), float(0.51), poreNoise).mul(
    smoothstep(float(0.31), float(0.36), poreNoise),
  );

  const albedoMod = float(1).sub(spotMask.mul(0.15));
  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(albedoMod);

  const poreDepth = float(1).sub(spotMask);
  const bumpStrength = float(params.normalScale * 0.06);
  const normalNode = bumpMap(poreDepth, bumpStrength);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(
    roughBase.add(spotMask.mul(0.1)).add(
      mx_noise_float(vec3(sampleUv.mul(12), seed.add(1.7))).mul(0.02),
    ),
    0.04,
    1,
  );

  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}
