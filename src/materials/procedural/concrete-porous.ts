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
import {
  triplanarMeterUvPairs,
  triplanarMeterWeights,
} from './procedural-triplanar-meters';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';

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

function buildConcretePorousFromMask(
  spotMask: Node<'float'>,
  params: ProceduralMaterialParams,
  sampleUvForRoughness: Node<'vec2'>,
  seed: Node<'float'>,
): ProceduralMaterialNodes {
  const albedoMod = float(1).sub(spotMask.mul(0.32));
  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(albedoMod);

  const poreDepth = float(1).sub(spotMask);
  const bumpStrength = float(params.normalScale * 0.16);
  const normalNode = bumpMap(poreDepth, bumpStrength);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(
    roughBase.add(spotMask.mul(0.12)).add(
      mx_noise_float(vec3(sampleUvForRoughness.mul(12), seed.add(1.7))).mul(0.02),
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

function buildConcretePorousTriplanar(params: ProceduralMaterialParams): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const offset = concretePorousSeedOffset(seed);
  const { wx, wy, wz } = triplanarMeterWeights();
  const uvs = triplanarMeterUvPairs(params.tileScale);

  const spotMask = buildConcreteBubbleMask(uvs.xy.add(offset), seed)
    .mul(wz)
    .add(buildConcreteBubbleMask(uvs.xz.add(offset), seed).mul(wy))
    .add(buildConcreteBubbleMask(uvs.yz.add(offset), seed).mul(wx));

  const avgUv = uvs.xy.mul(wz).add(uvs.xz.mul(wy)).add(uvs.yz.mul(wx));
  return buildConcretePorousFromMask(spotMask, params, avgUv, seed);
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
  return buildConcretePorousFromMask(spotMask, params, sampleUv, seed);
}

