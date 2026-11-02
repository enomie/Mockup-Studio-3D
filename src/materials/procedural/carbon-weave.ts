/**
 * Carbon fibre — 2×2 twill of flat fibre bundles under clear coat. Bundles
 * alternate between running along `.x` and `.y` in a diagonal staircase. The
 * anisotropic highlight direction follows each bundle, which gives carbon its
 * characteristic angle-dependent checker shimmer.
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
  mix,
  mod,
  select,
  sin,
  smoothstep,
  sqrt,
  step,
  vec2,
} from 'three/tsl';
import { buildProceduralSampleUv } from './procedural-sample-uv';
import { triplanarScalar } from './procedural-triplanar-meters';
import {
  ROUGHNESS_MIN,
  type ProceduralMaterialNodes,
  type ProceduralMaterialParams,
} from './procedural-types';
import { proceduralNoise3 } from './tsl-noise';

/** Bundles per tileScale unit; tileScale 6 → ~330 bundles/m (≈ 3 mm, classic 3K twill). */
const BUNDLES_PER_TILE = 55;
/** Single fibres per bundle width (fine streaks). */
const FIBRES_PER_BUNDLE = 14;

function carbonSeedOffset(seed: Node<'float'>) {
  return vec2(seed.mul(3.7), seed.mul(9.1));
}

interface CarbonSample {
  height: Node<'float'>;
  /** 1 where the bundle runs along `.y`, 0 along `.x`. */
  vertical: Node<'float'>;
}

function carbonTwill(sampleUv: Node<'vec2'>, seed: Node<'float'>): CarbonSample {
  const coord = sampleUv.mul(float(BUNDLES_PER_TILE));
  const cell = floor(coord);
  const f = fract(coord);

  // 2×2 twill: each bundle floats over two cells, shifted by one per row.
  const vertical = step(float(2), mod(cell.x.add(cell.y), float(4)));
  const across = select(vertical.greaterThan(0.5), f.x, f.y);
  const along = select(vertical.greaterThan(0.5), f.y, f.x);

  // Flat, rounded bundle cross-section with a thin dark seam at its edges.
  const d = abs(across.sub(0.5)).mul(2);
  const profile = sqrt(clamp(float(1).sub(d.mul(d).mul(d).mul(d)), 0, 1));
  // Slight dip where a bundle dives under its neighbour.
  const dive = smoothstep(float(0), float(0.12), along).mul(smoothstep(float(1), float(0.88), along));
  const bundle = profile.mul(mix(float(0.85), float(1), dive));

  const fibrePhase = across.mul(FIBRES_PER_BUNDLE * Math.PI * 2).add(
    proceduralNoise3(cell.xyy.add(seed)).mul(2),
  );
  const fibres = sin(fibrePhase).mul(0.04);
  const rawHeight = clamp(bundle.add(fibres.mul(bundle)), 0, 1);

  const pixel = fwidth(coord.x).add(fwidth(coord.y));
  const fade = float(1).sub(smoothstep(float(0.35), float(0.7), pixel));
  return {
    height: mix(float(0.8), rawHeight, fade),
    vertical: mix(float(0.5), vertical, fade),
  };
}

export function buildCarbonWeaveNodes(params: ProceduralMaterialParams): ProceduralMaterialNodes {
  const seed = float(params.seed);
  const offset = carbonSeedOffset(seed);

  let height: Node<'float'>;
  let vertical: Node<'float'>;
  if (params.samplingSpace === 'uv' || params.samplingSpace === 'planar-meters') {
    const sample = carbonTwill(buildProceduralSampleUv(params).add(offset), seed);
    height = sample.height;
    vertical = sample.vertical;
  } else {
    height = triplanarScalar(params.tileScale, offset, (uv) => carbonTwill(uv, seed).height);
    vertical = triplanarScalar(params.tileScale, offset, (uv) => carbonTwill(uv, seed).vertical);
  }

  const shade = mix(float(0.55), float(1), height).mul(mix(float(1), float(0.9), vertical));
  const colorNode = params.uniforms.color.mul(shade);
  const normalNode = bumpMap(height, float(params.normalScale * 0.02));
  const roughnessNode = clamp(
    params.uniforms.roughness
      .add(vertical.mul(0.05))
      .add(float(1).sub(height).mul(0.12)),
    ROUGHNESS_MIN,
    1,
  );
  // Tangent-space anisotropy direction follows the bundle.
  const anisotropyNode = mix(vec2(1, 0), vec2(0, 1), vertical).mul(params.uniforms.anisotropy);

  return { colorNode, normalNode, roughnessNode, anisotropyNode };
}
