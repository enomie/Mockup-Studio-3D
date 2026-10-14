/**
 * Crumpled fabric look — adapted from tsl-textures crumpled-fabric.js (MIT, Pavel Boytchev).
 */
import { bumpMap, clamp, exp, float, vec3 } from 'three/tsl';
import { meterPositionLocal } from './procedural-position';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';
import { proceduralNoise3 } from './tsl-noise';

function fabricPosition(params: ProceduralMaterialParams) {
  const seed = float(params.seed);
  if (params.samplingSpace === 'meter-3d') {
    return meterPositionLocal(params.tileScale, params.seed);
  }
  const uv = buildProceduralSampleUv(params);
  return vec3(uv.x, uv.y, seed);
}

export function buildFabricLinenNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const pinch = float(params.normalScale * 0.08);
  let pos = fabricPosition(params).mul(exp(float(params.tileScale).div(3).sub(0.5)));

  const warpA = vec3(
    proceduralNoise3(pos),
    proceduralNoise3(vec3(pos.y, pos.z, pos.x)),
    proceduralNoise3(vec3(pos.z, pos.x, pos.y)),
  ).mul(pinch);
  pos = pos.add(warpA);

  const warpB = vec3(
    proceduralNoise3(pos.mul(1.7)),
    proceduralNoise3(vec3(pos.y, pos.z, pos.x).mul(1.7)),
    proceduralNoise3(vec3(pos.z, pos.x, pos.y).mul(1.7)),
  ).mul(pinch);
  pos = pos.add(warpB);

  const k = proceduralNoise3(pos).add(1).div(2);
  const albedoMod = float(1).add(k.sub(0.5).mul(0.12));
  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(albedoMod);

  const bumpStrength = float(params.normalScale * 0.04);
  const normalNode = bumpMap(k, bumpStrength);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(roughBase.add(k.sub(0.5).mul(0.06)), 0.75, 0.98);

  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}
