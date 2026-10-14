import { abs, float, normalLocal, positionLocal, vec2 } from 'three/tsl';

const NORMAL_EPSILON = 1e-5;

/**
 * Blend weights from object-space normal (per-face on boxes, smooth on curved meshes).
 */
export function triplanarMeterWeights() {
  const n = abs(normalLocal);
  const sum = n.x.add(n.y).add(n.z).add(float(NORMAL_EPSILON));
  return {
    wx: n.x.div(sum),
    wy: n.y.div(sum),
    wz: n.z.div(sum),
  };
}

/** Three meter-scaled 2D planes for triplanar procedural sampling. */
export function triplanarMeterUvPairs(tileScale: number) {
  const scale = float(tileScale);
  const pos = positionLocal;
  return {
    xy: vec2(pos.x, pos.y).mul(scale),
    xz: vec2(pos.x, pos.z).mul(scale),
    yz: vec2(pos.y, pos.z).mul(scale),
  };
}
