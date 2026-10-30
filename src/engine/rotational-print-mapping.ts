import { BufferAttribute, type BufferGeometry } from 'three/webgpu';
import { bandUToTextureS, labelImageUSpan } from './beverage-can-label-unfold';

/**
 * Shared "wrap an image around the lathe axis" mapping for rotational assets
 * (beverage can, tin can, wine bottle, pen). Pure math; TSL mirror lives in
 * `rotational-print-nodes.ts`. Plan: _docs/planning/plan-rotational-print.md
 */

/** Geometry attribute holding print UVs; `uv` stays free for procedural grain and tangents. */
export const PRINT_UV_ATTRIBUTE = 'printUv';

/**
 * Printable band on the lathe surface. Without `phiLength` the band wraps the full
 * circumference (seam at −Z, U = 0.5 at +Z front). With `phiStart`/`phiLength` it is an
 * arc in lathe phi (`x = sin φ`, `z = cos φ`), e.g. the wine bottle label.
 */
export interface RotationalPrintBand {
  y0: number;
  y1: number;
  phiStart?: number;
  phiLength?: number;
}

/**
 * How image axes lie on the band.
 * - `wrap-width`: image width runs around the circumference, height along the axis (cans, bottle).
 * - `wrap-height`: image height runs around the circumference, width along the shaft (pen),
 *   rotated 180° so the cap end (+Y) reads on the left of the artwork.
 */
export type RotationalPrintLayout = 'wrap-width' | 'wrap-height';

/**
 * Image span per band axis. 1 = image fills the axis exactly; < 1 = image narrower
 * (band outside it stays unprinted); > 1 = image wider (cropped symmetrically).
 */
export interface RotationalPrintFit {
  layout: RotationalPrintLayout;
  spanU: number;
  spanV: number;
}

export interface RotationalPrintSample {
  s: number;
  t: number;
  /** 1 inside the band and covered by the image, else 0. */
  mask: number;
}

/** Full-wrap U, identical to the former `cylindricalLabelUv` (U = 0.5 at +Z, seam at −Z). */
function fullWrapU(x: number, z: number): number {
  const theta = Math.atan2(z, x);
  let u = (theta - Math.PI / 2) / (Math.PI * 2) + 0.5;
  if (u < 0) {
    u += 1;
  } else if (u >= 1) {
    u -= 1;
  }
  // Outside-facing mantle: flip U so flat artwork reads correctly (not mirrored).
  return 1 - u;
}

function arcU(x: number, z: number, phiStart: number, phiLength: number): number {
  let phi = Math.atan2(x, z);
  // Bring phi into [phiStart, phiStart + 2π) so arcs crossing the seam stay continuous.
  while (phi < phiStart) {
    phi += Math.PI * 2;
  }
  while (phi >= phiStart + Math.PI * 2) {
    phi -= Math.PI * 2;
  }
  return (phi - phiStart) / phiLength;
}

/**
 * Print UV at a surface point. V is not clamped: values outside [0, 1] (and U outside
 * [0, 1] on arcs) mark points outside the band, so lids and rings get mask 0.
 */
export function rotationalPrintUv(
  x: number,
  y: number,
  z: number,
  band: RotationalPrintBand,
): [number, number] {
  const span = band.y1 - band.y0;
  const v = span > 0 ? (y - band.y0) / span : 0;
  const u =
    band.phiLength !== undefined && band.phiLength < Math.PI * 2
      ? arcU(x, z, band.phiStart ?? -band.phiLength / 2, band.phiLength)
      : fullWrapU(x, z);
  return [u, v];
}

/** Write print UVs for every vertex (default attribute `printUv`). */
export function applyRotationalPrintUv(
  geometry: BufferGeometry,
  band: RotationalPrintBand,
  attributeName: string = PRINT_UV_ATTRIBUTE,
): void {
  const position = geometry.getAttribute('position');
  const uvs = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    const [u, v] = rotationalPrintUv(
      position.getX(i),
      position.getY(i),
      position.getZ(i),
      band,
    );
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }
  geometry.setAttribute(attributeName, new BufferAttribute(uvs, 2));
}

/**
 * Fit for a band of `planeW` (unrolled circumference or arc) × `planeH` (axis length).
 * Missing or invalid sizes give spans of 1 (stretch to band).
 */
export function rotationalPrintFit(
  layout: RotationalPrintLayout,
  planeW: number,
  planeH: number,
  imageW?: number,
  imageH?: number,
): RotationalPrintFit {
  if (
    imageW === undefined ||
    imageH === undefined ||
    !(planeW > 0 && planeH > 0 && imageW > 0 && imageH > 0)
  ) {
    return { layout, spanU: 1, spanV: 1 };
  }
  if (layout === 'wrap-height') {
    return {
      layout,
      spanU: labelImageUSpan(planeW, planeH, imageH, imageW),
      spanV: labelImageUSpan(planeH, planeW, imageW, imageH),
    };
  }
  return {
    layout,
    spanU: labelImageUSpan(planeW, planeH, imageW, imageH),
    spanV: 1,
  };
}

function inUnit(value: number): number {
  return value >= 0 && value <= 1 ? 1 : 0;
}

/** Narrow axes mask outside the image; wide axes are cropped, so always covered. */
function coverage(coord: number, span: number): number {
  return span >= 1 ? 1 : inUnit(coord);
}

/** Map a print UV to texture (s, t) plus the print mask (band × image coverage). */
export function sampleRotationalPrint(
  u: number,
  v: number,
  fit: RotationalPrintFit,
): RotationalPrintSample {
  const inBand = inUnit(u) * inUnit(v);
  if (fit.layout === 'wrap-height') {
    const tMapped = bandUToTextureS(1 - u, fit.spanU);
    const sMapped = bandUToTextureS(v, fit.spanV);
    return {
      s: 1 - sMapped,
      t: 1 - tMapped,
      mask: inBand * coverage(tMapped, fit.spanU) * coverage(sMapped, fit.spanV),
    };
  }
  const s = bandUToTextureS(u, fit.spanU);
  const t = bandUToTextureS(v, fit.spanV);
  return {
    s,
    t,
    mask: inBand * coverage(s, fit.spanU) * coverage(t, fit.spanV),
  };
}
