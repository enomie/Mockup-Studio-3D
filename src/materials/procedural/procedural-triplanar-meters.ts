import type { Node } from 'three/webgpu';
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

/**
 * Triplanar scalar: evaluates `sample` on each meter-scaled plane (plus `offset`)
 * and blends the results by normal weights. Blending results, not coordinates,
 * avoids smeared patterns on slanted faces.
 */
export function triplanarScalar(
  tileScale: number,
  offset: Node<'vec2'>,
  sample: (uv: Node<'vec2'>) => Node<'float'>,
): Node<'float'> {
  const { wx, wy, wz } = triplanarMeterWeights();
  const uvs = triplanarMeterUvPairs(tileScale);
  return sample(uvs.xy.add(offset))
    .mul(wz)
    .add(sample(uvs.xz.add(offset)).mul(wy))
    .add(sample(uvs.yz.add(offset)).mul(wx));
}
