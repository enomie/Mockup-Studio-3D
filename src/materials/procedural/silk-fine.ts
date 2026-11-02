/**
 * Fine silk — plain-weave micro relief plus a soft sheen lobe (applied on the
 * physical material via `sheen`). Non-metallic; the weave fades out where
 * threads become smaller than a pixel to avoid moiré.
 */
import type { Node } from 'three/webgpu';
import { bumpMap, clamp, float, floor, fwidth, mix, mod, sin, smoothstep, vec2, vec3 } from 'three/tsl';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import { triplanarScalar } from './procedural-triplanar-meters';
import {
  ROUGHNESS_MIN,
  type ProceduralMaterialNodes,
  type ProceduralMaterialParams,
} from './procedural-types';
import { proceduralNoise3 } from './tsl-noise';

/** Threads per tileScale unit (tileScale = repeats per meter). */
const THREADS_PER_TILE = 30;
const TAU = Math.PI * 2;

function silkSeedOffset(seed: Node<'float'>) {
  return vec2(seed.mul(7.7), seed.mul(19.3));
}

/** Plain weave height in [0, 1]: warp and weft alternate over/under per thread cell. */
function weaveHeight(sampleUv: Node<'vec2'>, seed: Node<'float'>) {
  const coord = sampleUv.mul(float(THREADS_PER_TILE));
  const cell = floor(coord);
  const over = mod(cell.x.add(cell.y), float(2));
  // Thread profile across its width (0 at gaps, 1 at the crown).
  const warp = sin(coord.x.mul(TAU)).mul(0.5).add(0.5);
  const weft = sin(coord.y.mul(TAU)).mul(0.5).add(0.5);
  const crowns = mix(warp, weft, over);
  // Slight per-thread irregularity (slubs).
  const slub = proceduralNoise3(vec3(cell.x.mul(0.37), cell.y.mul(0.37), seed)).mul(0.15);
  const height = clamp(crowns.add(slub), 0, 1);
  // Fade the weave once a thread gets close to pixel size.
  const fade = float(1).sub(smoothstep(float(0.25), float(0.5), fwidth(coord.x).add(fwidth(coord.y))));
  return mix(float(0.5), height, fade);
}

export function buildSilkFineNodes(params: ProceduralMaterialParams): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const offset = silkSeedOffset(seed);
  const weave =
    params.samplingSpace === 'uv' || params.samplingSpace === 'planar-meters'
      ? weaveHeight(buildProceduralSampleUv(params).add(offset), seed)
      : triplanarScalar(params.tileScale, offset, (uv) => weaveHeight(uv, seed));

  const base = params.uniforms.color;
  const colorNode = base.mul(mix(float(0.94), float(1.04), weave));
  const normalNode = bumpMap(weave, float(params.normalScale * 0.02));
  const roughnessNode = clamp(
    params.uniforms.roughness.add(weave.sub(0.5).mul(0.06)),
    ROUGHNESS_MIN,
    1,
  );

  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}
