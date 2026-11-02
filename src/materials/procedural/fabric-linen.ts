/**
 * Coarse linen / jute (burlap) — plain weave with thick, irregular, slightly
 * wavy threads and visible gaps between them. Warp threads run along `.y`,
 * weft threads along `.x`; they alternate over/under per crossing cell.
 * The weave fades to its average where threads approach pixel size (no moiré).
 */
import type { Node } from 'three/webgpu';
import {
  abs,
  bumpMap,
  clamp,
  float,
  floor,
  fract,
  fwidth,
  max,
  mix,
  mod,
  select,
  sin,
  smoothstep,
  sqrt,
  vec2,
  vec3,
} from 'three/tsl';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import { triplanarScalar } from './procedural-triplanar-meters';
import {
  ROUGHNESS_MIN,
  type ProceduralMaterialNodes,
  type ProceduralMaterialParams,
} from './procedural-types';
import { proceduralNoise3 } from './tsl-noise';

/** Threads per tileScale unit; tileScale 6 → ~300 threads/m (≈ 3.3 mm pitch, jute). */
const THREADS_PER_TILE = 50;
/** Thread width relative to the pitch; the rest is the gap between threads. */
const THREAD_WIDTH = 0.74;
const THREAD_WIDTH_VARIATION = 0.14;
/** Waviness of threads in pitch units. */
const THREAD_WOBBLE = 0.18;

function linenSeedOffset(seed: Node<'float'>) {
  return vec2(seed.mul(13.3), seed.mul(5.9));
}

/** Rounded thread cross-section: 1 at the crown, 0 at the edge and in the gap. */
function threadProfile(offsetFromCenter: Node<'float'>, width: Node<'float'>) {
  const d = abs(offsetFromCenter).mul(2).div(width);
  return sqrt(clamp(float(1).sub(d.mul(d)), 0, 1));
}

interface WeaveSample {
  /** Surface height in [0, 1] (0 = gap). */
  height: Node<'float'>;
  /** Per-thread brightness variation in about [-1, 1]. */
  tone: Node<'float'>;
}

function linenWeave(sampleUv: Node<'vec2'>, seed: Node<'float'>): WeaveSample {
  const coord = sampleUv.mul(float(THREADS_PER_TILE));

  // Wavy threads: shift each direction by low-frequency noise along the thread.
  const wobbleX = proceduralNoise3(vec3(coord.y.mul(0.15), coord.x.mul(0.02), seed));
  const wobbleY = proceduralNoise3(vec3(coord.x.mul(0.15), coord.y.mul(0.02), seed.add(3.1)));
  const wavy = vec2(
    coord.x.add(wobbleX.mul(THREAD_WOBBLE)),
    coord.y.add(wobbleY.mul(THREAD_WOBBLE)),
  );
  const cell = floor(wavy);
  const f = fract(wavy);

  // Thread thickness varies per thread and slowly along it (slubs).
  const warpWidth = float(THREAD_WIDTH).add(
    proceduralNoise3(vec3(cell.x.mul(0.73), wavy.y.mul(0.08), seed.add(5.2))).mul(
      THREAD_WIDTH_VARIATION,
    ),
  );
  const weftWidth = float(THREAD_WIDTH).add(
    proceduralNoise3(vec3(wavy.x.mul(0.08), cell.y.mul(0.73), seed.add(8.4))).mul(
      THREAD_WIDTH_VARIATION,
    ),
  );
  const warpProfile = threadProfile(f.x.sub(0.5), warpWidth);
  const weftProfile = threadProfile(f.y.sub(0.5), weftWidth);

  // Plain weave: warp on top where (x + y) is odd; the top thread arches over the crossing.
  const warpOnTop = mod(cell.x.add(cell.y), float(2));
  const archWarp = sin(f.y.mul(Math.PI));
  const archWeft = sin(f.x.mul(Math.PI));
  const warpHeight = warpProfile.mul(mix(float(0.42), float(0.7).add(archWarp.mul(0.3)), warpOnTop));
  const weftHeight = weftProfile.mul(
    mix(float(0.7).add(archWeft.mul(0.3)), float(0.42), warpOnTop),
  );
  const warpIsUp = warpHeight.greaterThan(weftHeight);

  // Fibres: fine noise stretched along the visible thread.
  const warpFibres = proceduralNoise3(vec3(wavy.x.mul(9), wavy.y.mul(1.2), seed.add(11.7)));
  const weftFibres = proceduralNoise3(vec3(wavy.x.mul(1.2), wavy.y.mul(9), seed.add(17.3)));
  const fibres = select(warpIsUp, warpFibres, weftFibres);

  const crown = max(warpHeight, weftHeight);
  const rawHeight = clamp(crown.add(fibres.mul(0.07).mul(crown)), 0, 1);

  const warpTone = proceduralNoise3(vec3(cell.x.mul(0.91), float(0.5), seed.add(23.1)));
  const weftTone = proceduralNoise3(vec3(float(0.5), cell.y.mul(0.91), seed.add(29.9)));
  const rawTone = select(warpIsUp, warpTone, weftTone).add(fibres.mul(0.5));

  const pixel = fwidth(coord.x).add(fwidth(coord.y));
  const fade = float(1).sub(smoothstep(float(0.35), float(0.7), pixel));
  return {
    height: mix(float(0.5), rawHeight, fade),
    tone: rawTone.mul(fade),
  };
}

export function buildFabricLinenNodes(
  params: ProceduralMaterialParams,
): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const offset = linenSeedOffset(seed);

  let height: Node<'float'>;
  let tone: Node<'float'>;
  if (params.samplingSpace === 'uv' || params.samplingSpace === 'planar-meters') {
    const weave = linenWeave(buildProceduralSampleUv(params).add(offset), seed);
    height = weave.height;
    tone = weave.tone;
  } else {
    height = triplanarScalar(params.tileScale, offset, (uv) => linenWeave(uv, seed).height);
    tone = triplanarScalar(params.tileScale, offset, (uv) => linenWeave(uv, seed).tone);
  }

  // Crowns bright, flanks and gaps dark (occlusion look), slight per-thread tone.
  const shade = mix(float(0.42), float(1.08), height).mul(float(1).add(tone.mul(0.07)));
  const colorNode = params.uniforms.color.mul(shade);

  const normalNode = bumpMap(height, float(params.normalScale * 0.06));
  const roughnessNode = clamp(
    params.uniforms.roughness.add(float(1).sub(height).mul(0.08)),
    ROUGHNESS_MIN,
    1,
  );

  return { colorNode, normalNode, roughnessNode };
}
