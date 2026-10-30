import { attribute, clamp, float, step, vec2 } from 'three/tsl';
import type { Node } from 'three/webgpu';
import {
  PRINT_UV_ATTRIBUTE,
  type RotationalPrintFit,
} from './rotational-print-mapping';

type FloatNode = Node<'float'>;
type Vec2Node = Node<'vec2'>;

export interface RotationalPrintNodes {
  /** Texture coordinate, clamped to [0, 1]. */
  sampleUv: Vec2Node;
  /** 1 inside the band and covered by the image, else 0 (PNG alpha not included). */
  inBandMask: FloatNode;
}

/** Print UVs written by `applyRotationalPrintUv`. */
export function printUvNode(): Vec2Node {
  return attribute(PRINT_UV_ATTRIBUTE, 'vec2');
}

function inUnitNode(value: FloatNode): FloatNode {
  return step(float(0), value).mul(step(value, float(1)));
}

function spanMappedCoordNode(band: FloatNode, span: number): FloatNode {
  const half = float(0.5);
  const spanNode = float(span);
  return span >= 1
    ? band.sub(half).mul(spanNode).add(half)
    : band.sub(half).div(spanNode).add(half);
}

function coverageNode(coord: FloatNode, span: number): FloatNode {
  return span >= 1 ? float(1) : inUnitNode(coord);
}

/** TSL mirror of `sampleRotationalPrint`. `bandUv` defaults to the `printUv` attribute. */
export function rotationalPrintNodes(
  fit: RotationalPrintFit,
  bandUv: Vec2Node = printUvNode(),
): RotationalPrintNodes {
  const u = bandUv.x as FloatNode;
  const v = bandUv.y as FloatNode;
  const inBand = inUnitNode(u).mul(inUnitNode(v));

  let s: FloatNode;
  let t: FloatNode;
  let covered: FloatNode;
  if (fit.layout === 'wrap-height') {
    const tMapped = spanMappedCoordNode(float(1).sub(u), fit.spanU);
    const sMapped = spanMappedCoordNode(v, fit.spanV);
    s = float(1).sub(sMapped);
    t = float(1).sub(tMapped);
    covered = coverageNode(tMapped, fit.spanU).mul(coverageNode(sMapped, fit.spanV));
  } else {
    s = spanMappedCoordNode(u, fit.spanU);
    t = spanMappedCoordNode(v, fit.spanV);
    covered = coverageNode(s, fit.spanU).mul(coverageNode(t, fit.spanV));
  }

  return {
    sampleUv: vec2(clamp(s, float(0), float(1)), clamp(t, float(0), float(1))),
    inBandMask: inBand.mul(covered),
  };
}

