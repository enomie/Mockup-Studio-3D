import { bumpMap, clamp, float, vec3 } from 'three/tsl';
import { meterPositionLocal } from './procedural-position';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';
import { proceduralNoise3 } from './tsl-noise';

interface PlasticSurfaceOptions {
  microStrength: number;
  roughnessVariation: number;
}

function samplePosition(params: ProceduralMaterialParams) {
  const seed = float(params.seed);
  if (params.samplingSpace === 'meter-3d') {
    return meterPositionLocal(params.tileScale, params.seed);
  }
  const uv = buildProceduralSampleUv(params);
  return vec3(uv.x, uv.y, seed);
}

export function buildPlasticSurfaceNodes(
  params: ProceduralMaterialParams,
  options: PlasticSurfaceOptions,
): ProceduralMaterialNodes {
  const pos = samplePosition(params);
  const micro = proceduralNoise3(pos.mul(8)).sub(0.5).mul(options.microStrength);

  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(
    float(1).add(micro.mul(0.04)),
  );

  const bumpStrength = float(params.normalScale * options.microStrength);
  const height = micro.add(0.5);
  const normalNode = bumpMap(height, bumpStrength);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(
    roughBase.add(micro.mul(options.roughnessVariation)),
    0.05,
    0.95,
  );

  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}

export function buildCoatedGlossNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  return buildPlasticSurfaceNodes(params, {
    microStrength: 0.025,
    roughnessVariation: 0.04,
  });
}

export function buildPlasticMatteNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  return buildPlasticSurfaceNodes(params, {
    microStrength: 0.06,
    roughnessVariation: 0.08,
  });
}

export function buildPlasticSmoothNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  return buildPlasticSurfaceNodes(params, {
    microStrength: 0.03,
    roughnessVariation: 0.05,
  });
}
