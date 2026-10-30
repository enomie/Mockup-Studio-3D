import { rotationalPrintUv } from './rotational-print-mapping';

/**
 * Cylindrical label unwrap UV (beverage can, tin can), V clamped to the band.
 * Spec: requirements-assets-beverage-can.md — U=0.5 at +Z front, seam at −Z.
 */
export function cylindricalLabelUv(
  x: number,
  y: number,
  z: number,
  labelY0: number,
  labelY1: number,
): [number, number] {
  const [u, v] = rotationalPrintUv(x, y, z, { y0: labelY0, y1: labelY1 });
  return [u, Math.min(1, Math.max(0, v))];
}
