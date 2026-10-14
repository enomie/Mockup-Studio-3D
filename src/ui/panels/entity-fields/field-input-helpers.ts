import { degToRad, radToDeg } from '@/units/angle';
import { SIZE_SCALE_MAX, SIZE_SCALE_MIN } from '@/constants';
import { parseMmFromMetersInput } from '@/units/length';
import type { AssetFaceId } from '@/scene/entity-types';

const SIZE_SCALE_DECIMALS = 3;

export function parseMmInput(raw: string): number | null {
  const mm = parseMmFromMetersInput(raw);
  if (mm === null || mm <= 0) {return null;}
  return mm;
}

export function formatSizeScale(value: number): string {
  return value.toFixed(SIZE_SCALE_DECIMALS);
}

export function parseSizeScaleInput(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {return null;}
  const value = Number.parseFloat(trimmed);
  if (Number.isNaN(value)) {return null;}
  if (value < SIZE_SCALE_MIN || value > SIZE_SCALE_MAX) {return null;}
  return value;
}

export const SIDE_FACE_IDS: AssetFaceId[] = ['left', 'right', 'top', 'bottom'];

export function formatDegrees(radians: number): string {
  return radToDeg(radians).toFixed(1);
}

export function parseDegreesInput(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {return null;}
  const value = Number.parseFloat(trimmed);
  if (Number.isNaN(value)) {return null;}
  return degToRad(value);
}
