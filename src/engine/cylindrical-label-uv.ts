/**
 * Cylindrical label unwrap UV (beverage can, tin can).
 * Spec: requirements-assets-beverage-can.md — U=0.5 at +Z front, seam at −Z.
 */
export function cylindricalLabelUv(
  x: number,
  y: number,
  z: number,
  labelY0: number,
  labelY1: number,
): [number, number] {
  const theta = Math.atan2(z, x);
  let u = (theta - Math.PI / 2) / (Math.PI * 2) + 0.5;
  if (u < 0) {
    u += 1;
  } else if (u >= 1) {
    u -= 1;
  }
  // Outside-facing mantle: flip U so flat artwork reads correctly (not mirrored).
  u = 1 - u;

  const span = labelY1 - labelY0;
  const v = span > 0 ? (y - labelY0) / span : 0;
  return [u, Math.min(1, Math.max(0, v))];
}
