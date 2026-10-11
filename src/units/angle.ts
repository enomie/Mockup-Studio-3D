export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

export function degToRad(deg: number): number {
  return deg * DEG_TO_RAD;
}

export function radToDeg(rad: number): number {
  return rad * RAD_TO_DEG;
}

/** Camera navigation angles in degrees (UI readout / panel). */
export const CAMERA_ANGLE_DECIMALS = 1;

export function formatDegreesDisplay(valueDeg: number, decimals = CAMERA_ANGLE_DECIMALS): string {
  return valueDeg.toFixed(decimals);
}

export function parseDegreesDisplayInput(
  raw: string,
  decimals = CAMERA_ANGLE_DECIMALS,
): number | null {
  const trimmed = raw.trim().replace(',', '.');
  const pattern = new RegExp(`^-?\\d+(\\.\\d{0,${decimals}})?$`);
  if (!pattern.test(trimmed)) return null;

  const value = Number.parseFloat(trimmed);
  if (Number.isNaN(value)) return null;
  return value;
}
