import type { Node } from 'three/webgpu';
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
import { triplanarScalar } from './procedural-triplanar-meters';
import {
  ROUGHNESS_MIN,
  type ProceduralMaterialNodes,
  type ProceduralMaterialParams,
} from './procedural-types';

/**
 * Isotropic bubble spots (same band-pass as v1). Slightly lower scale → sparser, larger voids.
 * At tileScale ≈ 6, ~14 → ~5–10 mm between spot centers.
 */
const BUBBLE_NOISE_SCALE = 14;

function concretePorousSeedOffset(seed: Node<'float'>) {
  return vec2(seed.mul(13.7), seed.mul(23.1));
}

/** Discrete roundish spots — no warp, no extra grain layers. */
function buildConcreteBubbleMask(sampleUv: Node<'vec2'>, seed: Node<'float'>) {
  const poreNoise = mx_noise_float(vec3(sampleUv.mul(float(BUBBLE_NOISE_SCALE)), seed.add(4.2)));

  return smoothstep(float(0.6), float(0.55), poreNoise).mul(
    smoothstep(float(0.32), float(0.37), poreNoise),
  );
}

function concretePorousRoughnessNoise(uv: Node<'vec2'>, seed: Node<'float'>) {
  return mx_noise_float(vec3(uv.mul(12), seed.add(1.7)));
}

function buildConcretePorousFromMask(
  spotMask: Node<'float'>,
  params: ProceduralMaterialParams,
  roughnessNoise: Node<'float'>,
): ProceduralMaterialNodes {
  const albedoMod = float(1).sub(spotMask.mul(0.32));
  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(albedoMod);

  const poreDepth = float(1).sub(spotMask);
  const bumpStrength = float(params.normalScale * 0.16);
  const normalNode = bumpMap(poreDepth, bumpStrength);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(
    roughBase.add(spotMask.mul(0.12)).add(
      roughnessNoise.mul(0.02),
    ),
    ROUGHNESS_MIN,
    1,
  );

  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}

function buildConcretePorousTriplanar(params: ProceduralMaterialParams): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const offset = concretePorousSeedOffset(seed);
  const spotMask = triplanarScalar(params.tileScale, offset, (uv) => buildConcreteBubbleMask(uv, seed));
  const roughnessNoise = triplanarScalar(params.tileScale, offset, (uv) =>
    concretePorousRoughnessNoise(uv, seed),
  );
  return buildConcretePorousFromMask(spotMask, params, roughnessNoise);
}

/** Porous concrete — round bubble cavities recessed into the surface. */
export function buildConcretePorousNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  if (params.samplingSpace === 'triplanar-meters') {
    return buildConcretePorousTriplanar(params);
  }

  const seed = float(params.seed);
  const sampleUv = buildProceduralSampleUv(params).add(concretePorousSeedOffset(seed));
  const spotMask = buildConcreteBubbleMask(sampleUv, seed);
  return buildConcretePorousFromMask(spotMask, params, concretePorousRoughnessNoise(sampleUv, seed));
}

