import { clamp, float, sin, vec3 } from 'three/tsl';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import {
  triplanarMeterUvPairs,
  triplanarMeterWeights,
} from './procedural-triplanar-meters';
import type { ProceduralMaterialNodes, ProceduralMaterialParams } from './procedural-types';

/** Streak bands per tileScale unit on perimeter UV (meters). ~120 × tileScale 28 ≈ 0.3 mm spacing. */
const BRUSHED_STREAKS_PER_TILE_UNIT = 120;
const BRUSHED_PHASE_SCALE = BRUSHED_STREAKS_PER_TILE_UNIT * Math.PI * 2;

/**
 * Brushed metal — streak look comes from physical anisotropy (tangent-U on frame UVs).
 * No bump normal: micro-perturbation + smoothed frame normals caused crushed blacks on edge faces.
 */
export function buildMetalBrushedNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const phase = (() => {
  if (params.samplingSpace === 'meter-3d') {
    const { wx, wy, wz } = triplanarMeterWeights();
    const uvs = triplanarMeterUvPairs(params.tileScale);
    const scale = float(BRUSHED_PHASE_SCALE);
    return uvs.xy.x
      .mul(scale)
      .mul(wz)
      .add(uvs.xz.x.mul(scale).mul(wy))
      .add(uvs.yz.x.mul(scale).mul(wx));
  }
    const sampleUv = buildProceduralSampleUv(params);
    return sampleUv.x.mul(float(BRUSHED_PHASE_SCALE));
  })();

  const colorNode = vec3(params.color.r, params.color.g, params.color.b);

  const roughBase = float(params.roughness);
  const roughnessNode = clamp(
    roughBase.add(sin(phase).mul(0.006)),
    0.12,
    0.5,
  );

  return {
    colorNode,
    roughnessNode,
  };
}
