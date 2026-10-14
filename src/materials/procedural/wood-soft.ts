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
import { meterPositionLocal } from './procedural-position';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import {
  triplanarMeterUvPairs,
  triplanarMeterWeights,
} from './procedural-triplanar-meters';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';
import { proceduralNoise3 } from './tsl-noise';

 

function woodSoftSeedOffset(seed: any) {
  return vec2(seed.mul(17.3), seed.mul(31.7));
}

/** Ring + pore grain in meter-scaled 2D UV (one tangent plane). */
function buildWoodSoftGrainScalar(sampleUv: any, seed: any) {
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

  return clamp(band.mul(0.82).add(pores).add(0.08), 0, 1);
}

function buildWoodSoftNodesFromGrain(
  grain: any,
  params: ProceduralMaterialParams,
  sampleUvForRoughness: any,
  seed: any,
): ProceduralMaterialNodes {
  const albedoMod = mix(float(0.62), float(1.12), grain);
  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(albedoMod);

  const bumpStrength = float(params.normalScale * 0.14);
  const normalNode = bumpMap(grain, bumpStrength);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(
    roughBase
      .sub(grain.mul(0.12))
      .add(mx_noise_float(vec3(sampleUvForRoughness.mul(8), seed)).mul(0.04)),
    0.28,
    0.72,
  );

  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}

function buildWoodSoftTriplanar(params: ProceduralMaterialParams): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const offset = woodSoftSeedOffset(seed);
  const { wx, wy, wz } = triplanarMeterWeights();
  const uvs = triplanarMeterUvPairs(params.tileScale);

  const grain = buildWoodSoftGrainScalar(uvs.xy.add(offset), seed)
    .mul(wz)
    .add(buildWoodSoftGrainScalar(uvs.xz.add(offset), seed).mul(wy))
    .add(buildWoodSoftGrainScalar(uvs.yz.add(offset), seed).mul(wx));

  const avgUv = uvs.xy.mul(wz).add(uvs.xz.mul(wy)).add(uvs.yz.mul(wx));
  return buildWoodSoftNodesFromGrain(grain, params, avgUv, seed);
}

/** Softwood grain — subtle rings and pores (spruce-like). */
export function buildWoodSoftNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  if (params.samplingSpace === 'triplanar-meters') {
    return buildWoodSoftTriplanar(params);
  }

  if (params.samplingSpace === 'meter-3d') {
    return buildWoodSoftMeter3d(params);
  }

  const seed = float(params.seed);
  const sampleUv = buildProceduralSampleUv(params).add(woodSoftSeedOffset(seed));
  const grain = buildWoodSoftGrainScalar(sampleUv, seed);
  return buildWoodSoftNodesFromGrain(grain, params, sampleUv, seed);
}

/** Wood rings in object-local meters — ground / legacy meter-3d (tsl-textures wood.js). */
function buildWoodSoftMeter3d(params: ProceduralMaterialParams): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const pos = meterPositionLocal(params.tileScale, params.seed);
  const detail = float(params.tileScale).div(3).sub(1).exp().mul(0.22);
  const scaled = vec3(pos.x.mul(detail), pos.y.mul(detail.mul(4)), pos.z.mul(detail));
  const ringWarp = proceduralNoise3(scaled.mul(2.5).add(seed)).mul(0.28);
  const rings = fract(pos.x.mul(detail.mul(5.5)).add(ringWarp));
  const band = smoothstep(float(0.12), float(0.38), rings).mul(
    smoothstep(float(0.88), float(0.52), rings),
  );
  const pores = proceduralNoise3(scaled.mul(22).add(seed.add(12.5))).sub(0.5).mul(0.18);
  const grain = clamp(band.mul(0.82).add(pores).add(0.08), 0, 1);
  const albedoMod = mix(float(0.62), float(1.12), grain);
  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(albedoMod);
  const bumpStrength = float(params.normalScale * 0.14);
  const normalNode = bumpMap(grain, bumpStrength);
  const roughBase = float(params.roughness);
  const roughnessNode = clamp(
    roughBase.sub(grain.mul(0.12)).add(proceduralNoise3(scaled.mul(8).add(seed)).mul(0.04)),
    0.28,
    0.72,
  );
  return { colorNode, normalNode, roughnessNode };
}

 
