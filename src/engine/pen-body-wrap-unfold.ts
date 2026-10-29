import type { Vector2 } from 'three/webgpu';
import { bandUToTextureS, labelImageUSpan } from './beverage-can-label-unfold';
import { penNominalFootprintM, type PenBodyProfile } from '@/scene/asset-pen';

/** Marker body max X / global profile max X (authoring SVG). */
export const PEN_NOMINAL_BODY_RADIUS_RATIO = 26.09 / 28.35;

export function maxBodyRadiusM(bodyPoints: Vector2[]): number {
  let maxR = 0;
  for (const p of bodyPoints) {
    maxR = Math.max(maxR, p.x);
  }
  return maxR;
}

export function penBodyYBounds(bodyPoints: Vector2[]): { y0: number; y1: number } {
  if (bodyPoints.length === 0) {
    return { y0: 0, y1: 0 };
  }
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of bodyPoints) {
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  return { y0, y1 };
}

export function penBodyWrapCoverPlaneM(
  bodyPoints: Vector2[],
): { planeW: number; planeH: number } {
  const { y0, y1 } = penBodyYBounds(bodyPoints);
  const bodyR = maxBodyRadiusM(bodyPoints);
  return {
    planeW: 2 * Math.PI * bodyR,
    planeH: Math.max(0, y1 - y0),
  };
}

export function computePenBodyWrapAspect(
  bodyPoints: Vector2[],
): { widthOverHeight: number } {
  const { planeW, planeH } = penBodyWrapCoverPlaneM(bodyPoints);
  if (planeH <= 0) {
    return { widthOverHeight: 1 };
  }
  return { widthOverHeight: planeW / planeH };
}

/** Image height spans circumference (rotated vs can label). */
export function penWrapCircumferenceSpan(
  planeW: number,
  planeH: number,
  imageW: number,
  imageH: number,
): number {
  return labelImageUSpan(planeW, planeH, imageH, imageW);
}

/** Image width spans body length. */
export function penWrapBodyLengthSpan(
  planeW: number,
  planeH: number,
  imageW: number,
  imageH: number,
): number {
  return labelImageUSpan(planeH, planeW, imageW, imageH);
}

export interface PenWrapTextureSpans {
  circumferenceSpan: number;
  bodyLengthSpan: number;
}

export function penWrapTextureSpans(
  planeW: number,
  planeH: number,
  imageW: number,
  imageH: number,
): PenWrapTextureSpans {
  return {
    circumferenceSpan: penWrapCircumferenceSpan(planeW, planeH, imageW, imageH),
    bodyLengthSpan: penWrapBodyLengthSpan(planeW, planeH, imageW, imageH),
  };
}

/** Circumference band U → texture T (image height); flipped vs raw U so artwork is not mirrored. */
export function penBandUToCircumferenceTextureT(bandU: number, circumferenceSpan: number): number {
  return bandUToTextureS(1 - bandU, circumferenceSpan);
}

/** 180° in texture space — cap (+Y) reads on the left of the artwork at +Z front. */
export function rotatePenWrapTextureSt180(s: number, t: number): { s: number; t: number } {
  return { s: 1 - s, t: 1 - t };
}

/** Map cylindrical body UV (u = wrap, v = along shaft) to texture (s, t). */
export function mapPenBandUvToTextureST(
  bandU: number,
  bandV: number,
  spans: PenWrapTextureSpans,
): { s: number; t: number } {
  const t = penBandUToCircumferenceTextureT(bandU, spans.circumferenceSpan);
  const s = bandUToTextureS(bandV, spans.bodyLengthSpan);
  return rotatePenWrapTextureSt180(s, t);
}

/** Sync placeholder aspect before SVG load (nominal body wrap unfold). */
export function penBodyWrapAspectNominal(profile: PenBodyProfile): number {
  const footprint = penNominalFootprintM(profile);
  const bodyRadiusM = (footprint.widthM / 2) * PEN_NOMINAL_BODY_RADIUS_RATIO;
  const bodyHeightM = footprint.heightM;
  if (bodyHeightM <= 0) {
    return 1;
  }
  return (2 * Math.PI * bodyRadiusM) / bodyHeightM;
}
