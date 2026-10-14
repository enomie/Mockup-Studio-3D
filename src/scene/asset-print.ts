import { MM_TO_M } from '@/units/length';

/** Geometry params for print assets — mm values at sizeScale 1. */
export interface PrintDeviceParams {
  cornerRadiusMm: number;
}
const CORNER_EPSILON_M = 0.0001;

export function defaultPrintParams(): PrintDeviceParams {
  return { cornerRadiusMm: 0.5 };
}

export function clonePrintParams(params: PrintDeviceParams): PrintDeviceParams {
  return { ...params };
}

export function printCornerRadiusM(
  params: PrintDeviceParams,
  faceWidth: number,
  faceHeight: number,
  sizeScale = 1,
): number {
  const radiusM = params.cornerRadiusMm * MM_TO_M * sizeScale;
  const maxRadius = Math.min(faceWidth, faceHeight) * 0.5 - CORNER_EPSILON_M;
  return Math.max(0, Math.min(radiusM, maxRadius));
}
