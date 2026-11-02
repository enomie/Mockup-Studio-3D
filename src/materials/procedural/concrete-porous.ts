import type { Node } from 'three/webgpu';
import {
  bumpMap,
  clamp,
  float,
  mx_noise_float,
  mx_worley_noise_float,
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
 * Worley cells per tileScale unit. At tileScale ≈ 6, ~14 → ~12 mm cell size.
 */
const BUBBLE_NOISE_SCALE = 14;

function concretePorousSeedOffset(seed: Node<'float'>) {
  return vec2(seed.mul(13.7), seed.mul(23.1));
}

/** Pore radius in Worley cell units, and how much it varies across the surface. */
const PORE_RADIUS = 0.16;
const PORE_RADIUS_VARIATION = 0.12;
const PORE_EDGE = 0.04;

/**
 * Round pores: distance to the nearest Worley feature point, thresholded by a
 * slowly varying radius. Where the radius drops to zero there are no pores, so
 * size and density vary naturally.
 */
function buildConcreteBubbleMask(sampleUv: Node<'vec2'>, seed: Node<'float'>) {
  const cellDistance = mx_worley_noise_float(
    vec3(sampleUv.mul(float(BUBBLE_NOISE_SCALE)), seed.add(4.2)),
  );
  const sizeNoise = mx_noise_float(
    vec3(sampleUv.mul(float(BUBBLE_NOISE_SCALE * 0.35)), seed.add(9.7)),
  );
  const radius = float(PORE_RADIUS).add(sizeNoise.mul(PORE_RADIUS_VARIATION));
  return float(1).sub(smoothstep(radius.sub(PORE_EDGE), radius, cellDistance));
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

