import { float, positionLocal, vec3 } from 'three/tsl';

/** Object-local position in meter-scaled procedural space (tileScale = repeats per meter). */
export function meterPositionLocal(tileScale: number, seed: number) {
  const scale = float(tileScale);
  const s = float(seed);
  const seedOffset = vec3(s.mul(11.3), s.mul(23.9), s.mul(7.1));
  return positionLocal.mul(scale).add(seedOffset);
}
