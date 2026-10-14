import {
  bumpMap,
  clamp,
  float,
  mx_noise_float,
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

function paperGrainScalarAt(
  sampleUv: ReturnType<typeof buildProceduralSampleUv>,
   
  seed: any,
) {
  const fiberStreaks = mx_noise_float(
    vec3(sampleUv.x.mul(0.25), sampleUv.y.mul(6), seed),
  )
    .sub(0.5)
    .mul(0.04);

  const micro = mx_noise_float(vec3(sampleUv.mul(vec2(72, 96)), seed.add(5.1)))
    .sub(0.5)
    .mul(0.035);

  return clamp(fiberStreaks.add(micro).add(0.5), 0, 1);
}

function buildPaperGrainScalar(params: ProceduralMaterialParams) {
  const seed = float(params.seed);
  const seedOffset = vec2(seed.mul(11.3), seed.mul(23.9));

  if (params.samplingSpace === 'meter-3d') {
    const pos = meterPositionLocal(params.tileScale, params.seed);
    const n = proceduralNoise3(pos.mul(vec3(0.25, 6, 4)));
    const micro = proceduralNoise3(pos.mul(72).add(seed.add(5.1))).sub(0.5).mul(0.035);
    const fiber = n.sub(0.5).mul(0.04);
    return clamp(fiber.add(micro).add(0.5), 0, 1);
  }

  if (params.samplingSpace === 'triplanar-meters') {
    const { wx, wy, wz } = triplanarMeterWeights();
    const uvs = triplanarMeterUvPairs(params.tileScale);
    return paperGrainScalarAt(uvs.xy.add(seedOffset), seed)
      .mul(wz)
      .add(paperGrainScalarAt(uvs.xz.add(seedOffset), seed).mul(wy))
      .add(paperGrainScalarAt(uvs.yz.add(seedOffset), seed).mul(wx));
  }

  const sampleUv = buildProceduralSampleUv(params).add(seedOffset);
  return paperGrainScalarAt(sampleUv, seed);
}

/**
 * Paper grain — meter-3d on solids; planar on frame; triplanar legacy path retained.
 */
export function buildPaperGrainNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const grain = buildPaperGrainScalar(params);

  const albedoMod = float(1).add(grain.sub(0.5).mul(0.08));
  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(albedoMod);

  const bumpStrength = float(params.normalScale * 0.025);
  const normalNode = bumpMap(grain, bumpStrength);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(roughBase.add(grain.sub(0.5).mul(0.03)), 0.75, 1);

  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}
