/**
 * Fine silk — long, fine streaks along the grain (like brushed metal) with
 * organic disturbances: wavy lines, wide light/dark bands and dropouts where
 * single streaks fade. The anisotropic highlight and sheen lobe are applied on
 * the physical material. Non-metallic; the streaks fade out where lines become
 * smaller than a pixel to avoid moiré.
 */
import type { Node } from 'three/webgpu';
import { bumpMap, clamp, float, fwidth, mix, smoothstep, vec2, vec3 } from 'three/tsl';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import { triplanarScalar } from './procedural-triplanar-meters';
import {
  ROUGHNESS_MIN,
  type ProceduralMaterialNodes,
  type ProceduralMaterialParams,
} from './procedural-types';
import { proceduralNoise3 } from './tsl-noise';

/** Streaks across the grain per tileScale unit; ~40 × tileScale 28 ≈ 0.9 mm spacing. */
const STREAKS_ACROSS_PER_TILE = 40;
/** Streak length: low frequency along the grain. */
const STREAKS_ALONG_PER_TILE = 0.5;
/** Waviness: how far (in streak widths) lines drift sideways along their length. */
const WAVE_AMPLITUDE = 2.5;
/** Bump strength per normalScale unit; kept low to avoid crushed blacks on edges. */
const SILK_BUMP_PER_NORMAL_SCALE = 0.01;

function silkSeedOffset(seed: Node<'float'>) {
  return vec2(seed.mul(11.3), seed.mul(3.7));
}

/** Streak height in about [-1, 1]; `.x` = along grain, `.y` = across. */
function silkStreaks(sampleUv: Node<'vec2'>, seed: Node<'float'>) {
  const along = sampleUv.x.mul(float(STREAKS_ALONG_PER_TILE));
  const acrossRaw = sampleUv.y.mul(float(STREAKS_ACROSS_PER_TILE));
  // Wavy lines: shift the cross coordinate with a slow noise running along the grain.
  const wave = proceduralNoise3(vec3(along.mul(0.8), acrossRaw.mul(0.04), seed.add(2.1)));
  const across = acrossRaw.add(wave.mul(WAVE_AMPLITUDE));

  const fine = proceduralNoise3(vec3(along, across, seed));
  const coarse = proceduralNoise3(vec3(along, across.mul(0.23), seed.add(9.1)));
  const lines = fine.mul(0.7).add(coarse.mul(0.3));

  // Dropouts: individual streaks weaken or break off along their length.
  const dropoutNoise = proceduralNoise3(vec3(along.mul(0.6), acrossRaw.mul(0.7), seed.add(7.4)));
  const strength = mix(float(0.3), float(1), smoothstep(float(-0.3), float(0.4), dropoutNoise));

  // Wide bands: groups of fibres that are slightly lighter or darker.
  const bands = proceduralNoise3(vec3(along.mul(0.25), acrossRaw.mul(0.015), seed.add(5.5)));

  const combined = lines.mul(strength).add(bands.mul(0.5));
  // Fade the streaks once a line gets close to pixel size.
  const fade = float(1).sub(smoothstep(float(0.35), float(0.7), fwidth(acrossRaw)));
  return combined.mul(fade);
}

export function buildSilkFineNodes(params: ProceduralMaterialParams): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const offset = silkSeedOffset(seed);
  const streaks =
    params.samplingSpace === 'uv' || params.samplingSpace === 'planar-meters'
      ? silkStreaks(buildProceduralSampleUv(params).add(offset), seed)
      : triplanarScalar(params.tileScale, offset, (uv) => silkStreaks(uv, seed));

  const colorNode = params.uniforms.color.mul(float(1).add(streaks.mul(0.05)));
  const normalNode = bumpMap(
    streaks.mul(0.5).add(0.5),
    float(params.normalScale * SILK_BUMP_PER_NORMAL_SCALE),
  );
  const roughnessNode = clamp(
    params.uniforms.roughness.add(streaks.mul(0.08)),
    ROUGHNESS_MIN,
    1,
  );

  return { colorNode, normalNode, roughnessNode };
}
