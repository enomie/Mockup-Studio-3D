export const CLOTH_SIZE_MIN_M = 0.2;
export const CLOTH_SIZE_MAX_M = 2.0;

export function clampClothSizeMeters(value: number): number {
  return Math.min(CLOTH_SIZE_MAX_M, Math.max(CLOTH_SIZE_MIN_M, value));
}
