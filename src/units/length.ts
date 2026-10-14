export const MM_TO_M = 0.001;

export function mmToM(mm: number): number {
  return mm * MM_TO_M;
}

export function mToMm(m: number): number {
  return m / MM_TO_M;
}

/** UI length precision: meters with 4 decimals (= 0.1 mm). */
export const LENGTH_DECIMALS = 4;

/** Smallest step in meters (0.1 mm). */
export const LENGTH_STEP_M = 0.0001;

export function formatLengthMeters(valueM: number, decimals = LENGTH_DECIMALS): string {
  return valueM.toFixed(decimals);
}

export function parseLengthMetersInput(
  raw: string,
  decimals = LENGTH_DECIMALS,
): number | null {
  const trimmed = raw.trim().replace(',', '.');
  const pattern = new RegExp(`^-?\\d+(\\.\\d{0,${decimals}})?$`);
  if (!pattern.test(trimmed)) {return null;}

  const value = Number.parseFloat(trimmed);
  if (Number.isNaN(value)) {return null;}
  return value;
}

export function formatMmAsMeters(mm: number, decimals = LENGTH_DECIMALS): string {
  return formatLengthMeters(mmToM(mm), decimals);
}

export function parseMmFromMetersInput(
  raw: string,
  decimals = LENGTH_DECIMALS,
): number | null {
  const meters = parseLengthMetersInput(raw, decimals);
  if (meters === null) {return null;}
  return mToMm(meters);
}
