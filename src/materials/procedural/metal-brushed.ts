import type { Node } from 'three/webgpu';
import { bumpMap, clamp, float, vec2, vec3 } from 'three/tsl';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import { triplanarScalar } from './procedural-triplanar-meters';
import {
  ROUGHNESS_MIN,
  type ProceduralMaterialNodes,
  type ProceduralMaterialParams,
} from './procedural-types';
import { proceduralNoise3 } from './tsl-noise';

/** Brush lines per tileScale unit across the grain; ~40 × tileScale 28 ≈ 0.9 mm spacing. */
const STREAKS_ACROSS_PER_TILE = 40;
/** Streak length: low frequency along the grain. */
const STREAKS_ALONG_PER_TILE = 0.6;
/**
 * Bump strength per normalScale unit. Kept very low: strong micro normals on
 * smoothed frame edges caused crushed blacks. Anisotropy carries the main look.
 */
const BRUSHED_BUMP_PER_NORMAL_SCALE = 0.008;

function brushedSeedOffset(seed: Node<'float'>) {
  return vec2(seed.mul(17.9), seed.mul(5.3));
}

/** Streak height in about [-1, 1]; `.x` = along grain, `.y` = across. */
function brushedStreaks(sampleUv: Node<'vec2'>, seed: Node<'float'>) {
  const coord = vec3(
    sampleUv.x.mul(float(STREAKS_ALONG_PER_TILE)),
    sampleUv.y.mul(float(STREAKS_ACROSS_PER_TILE)),
    seed,
  );
  const fine = proceduralNoise3(coord);
  const coarse = proceduralNoise3(coord.mul(vec3(1, 0.23, 1)).add(vec3(0, 0, 9.1)));
  return fine.mul(0.7).add(coarse.mul(0.3));
}

/** Brushed metal — anisotropic highlight plus fine streaks in relief and roughness. */
export function buildMetalBrushedNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const offset = brushedSeedOffset(seed);
  const streaks =
    params.samplingSpace === 'meter-3d' || params.samplingSpace === 'triplanar-meters'
      ? triplanarScalar(params.tileScale, offset, (uv) => brushedStreaks(uv, seed))
      : brushedStreaks(buildProceduralSampleUv(params).add(offset), seed);

  const colorNode = vec3(params.color.r, params.color.g, params.color.b).mul(
    float(1).add(streaks.mul(0.02)),
  );
  const normalNode = bumpMap(
    streaks.mul(0.5).add(0.5),
    float(params.normalScale * BRUSHED_BUMP_PER_NORMAL_SCALE),
  );
  const roughnessNode = clamp(
    float(params.roughness).add(streaks.mul(0.05)),
    ROUGHNESS_MIN,
    1,
  );

  return { colorNode, normalNode, roughnessNode };
}
