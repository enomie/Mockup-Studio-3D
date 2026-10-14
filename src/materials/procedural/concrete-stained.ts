/**
 * Concrete stained — variegated albedo + micro bump (tsl-textures concrete.js, MIT, Pavel Boytchev).
 */
import { bumpMap, clamp, float, vec3 } from 'three/tsl';
import { meterPositionLocal } from './procedural-position';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';
import { proceduralNoise3 } from './tsl-noise';

function concreteStainedPosition(params: ProceduralMaterialParams) {
  const seed = float(params.seed);
  if (params.samplingSpace === 'meter-3d') {
    return meterPositionLocal(params.tileScale, params.seed);
  }
  const uv = buildProceduralSampleUv(params);
  return vec3(uv.x, uv.y, seed);
}

export function buildConcreteStainedNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const pos = concreteStainedPosition(params);
  const bump = proceduralNoise3(pos.mul(3.2)).abs().pow(float(1.2 + params.normalScale * 0.4));
  const albedoMod = float(1).sub(bump.mul(0.08));
  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(albedoMod);

  const bumpStrength = float(params.normalScale * 0.12);
  const normalNode = bumpMap(bump, bumpStrength);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(roughBase.add(bump.mul(0.15)), 0.85, 1);

  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}
