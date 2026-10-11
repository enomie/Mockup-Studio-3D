import { float, mix, uv, vec2 } from 'three/tsl';

/**
 * Build tiled UV for grain materials on box meshes.
 * Frame bars: horizontal pieces need grain along U; vertical pieces along V.
 * `.x` = along-grain, `.y` = cross-grain.
 */
export function buildGrainSampleUv(tileScale: number, grainAlongU: boolean) {
  const scale = float(tileScale);
  const scaledU = uv().x.mul(scale);
  const scaledV = uv().y.mul(scale);
  const alongU = float(grainAlongU ? 1 : 0);
  const grainCoord = mix(scaledV, scaledU, alongU);
  const crossCoord = mix(scaledU, scaledV, alongU);
  return vec2(grainCoord, crossCoord);
}
