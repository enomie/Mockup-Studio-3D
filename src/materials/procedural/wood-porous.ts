import {
  bumpMap,
  clamp,
  float,
  mix,
  mx_noise_float,
  smoothstep,
  vec2,
  vec3,
} from 'three/tsl';
import { meterPositionLocal } from './procedural-position';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import {
  triplanarMeterUvPairs,
  triplanarMeterWeights,
} from './procedural-triplanar-meters';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';
import { proceduralNoise3 } from './tsl-noise';

/**
 * Noise scale on stretched UV. With tileScale ≈ 6 on frame perimeter UVs (meters),
 * ~34 → ~12 mm center-to-center along grain; spot diameter ~0.6–1.0 mm (narrow smoothstep).
 */
const PORE_NOISE_SCALE = 34;
const PORE_STRETCH_ALONG_GRAIN = 0.4;
const PORE_STRETCH_ACROSS_GRAIN = 2.4;

 

function woodPorousSeedOffset(seed: any) {
  return vec2(seed.mul(19.1), seed.mul(29.3));
}

function buildWoodPorousSpotMask(sampleUv: any, seed: any) {
  const stretched = vec2(
    sampleUv.x.mul(float(PORE_STRETCH_ALONG_GRAIN)),
    sampleUv.y.mul(float(PORE_STRETCH_ACROSS_GRAIN)),
  );
  const poreNoise = mx_noise_float(vec3(stretched.mul(float(PORE_NOISE_SCALE)), seed.add(6.4)));

  return smoothstep(float(0.56), float(0.51), poreNoise).mul(
    smoothstep(float(0.31), float(0.36), poreNoise),
  );
}

function buildWoodPorousFromSpotMask(
  spotMask: any,
  params: ProceduralMaterialParams,
  sampleUvForRoughness: any,
  seed: any,
): ProceduralMaterialNodes {
  const albedoMod = float(1).sub(spotMask.mul(0.15));
  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(albedoMod);

  const poreDepth = float(1).sub(spotMask);
  const bumpStrength = float(params.normalScale * 0.06);
  const normalNode = bumpMap(poreDepth, bumpStrength);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(
    roughBase.add(spotMask.mul(0.1)).add(
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

function buildWoodPorousTriplanar(params: ProceduralMaterialParams): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const offset = woodPorousSeedOffset(seed);
  const { wx, wy, wz } = triplanarMeterWeights();
  const uvs = triplanarMeterUvPairs(params.tileScale);

  const spotMask = buildWoodPorousSpotMask(uvs.xy.add(offset), seed)
    .mul(wz)
    .add(buildWoodPorousSpotMask(uvs.xz.add(offset), seed).mul(wy))
    .add(buildWoodPorousSpotMask(uvs.yz.add(offset), seed).mul(wx));

  const avgUv = uvs.xy.mul(wz).add(uvs.xz.mul(wy)).add(uvs.yz.mul(wx));
  return buildWoodPorousFromSpotMask(spotMask, params, avgUv, seed);
}

/** Porous wood — small elongated dark spots only, no growth rings. */
export function buildWoodPorousNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  if (params.samplingSpace === 'triplanar-meters') {
    return buildWoodPorousTriplanar(params);
  }

  if (params.samplingSpace === 'meter-3d') {
    return buildWoodPorousMeter3d(params);
  }

  const seed = float(params.seed);
  const sampleUv = buildProceduralSampleUv(params).add(woodPorousSeedOffset(seed));
  const spotMask = buildWoodPorousSpotMask(sampleUv, seed);
  return buildWoodPorousFromSpotMask(spotMask, params, sampleUv, seed);
}

/** Processed-wood style bands — ground / legacy meter-3d (tsl-textures processed-wood.js). */
function buildWoodPorousMeter3d(params: ProceduralMaterialParams): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const pos = meterPositionLocal(params.tileScale, params.seed);
  const xscale = float(params.tileScale).div(2).add(1);
  const scaled = pos.mul(xscale.exp()).add(seed);
  const len = float(9).reciprocal();
  const k = proceduralNoise3(scaled.mul(vec3(xscale, len, len)));
  const k2 = k.mul(proceduralNoise3(scaled.mul(vec3(25, 1, 1))).sub(1).mul(0.2));
  const maskInput = k2.add(float(params.normalScale * 0.1).sub(0.5));
  const mask = float(1).sub(smoothstep(float(-0.3), float(0.3), maskInput));
  const base = vec3(params.color.r, params.color.g, params.color.b);
  const dark = base.mul(0.78);
  const colorNode = mix(base, dark, mask);
  const bumpStrength = float(params.normalScale * 0.08);
  const normalNode = bumpMap(float(1).sub(mask), bumpStrength);
  const roughnessNode = clamp(float(params.roughness).add(mask.mul(0.08)), 0.35, 0.65);
  return { colorNode, normalNode, roughnessNode };
}

 
