/**
 * Satin sheen — adapted from tsl-textures satin.js (MIT, Pavel Boytchev).
 */
import { clamp, float, mix, vec3 } from 'three/tsl';
import { meterPositionLocal } from './procedural-position';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';
import { proceduralNoise3 } from './tsl-noise';

export function buildSilkFineNodes(params: ProceduralMaterialParams): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const pos =
    params.samplingSpace === 'meter-3d'
      ? meterPositionLocal(params.tileScale, params.seed)
      : vec3(
          buildProceduralSampleUv(params).x,
          buildProceduralSampleUv(params).y,
          seed,
        );

  const scale = float(params.tileScale).div(3).exp();
  const n1 = proceduralNoise3(
    vec3(
      proceduralNoise3(vec3(pos.x.mul(2), pos.y, pos.z)).mul(scale),
      proceduralNoise3(vec3(pos.x, pos.y.mul(2), pos.z)).mul(scale),
      proceduralNoise3(vec3(pos.x, pos.y, pos.z.mul(2))).mul(scale),
    ).mul(scale).add(seed),
  )
    .abs()
    .pow(3)
    .mul(20);

  const base = vec3(params.color.r, params.color.g, params.color.b);
  const highlight = base.mul(1.08);
  const colorNode = mix(base, highlight, clamp(n1, 0, 1));

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(roughBase.sub(n1.mul(0.02)), 0.25, 0.65);

  return {
    colorNode,
    roughnessNode,
  };
}
