import type { AssetKind } from './asset-kind';
import { MM_TO_M } from '@/units/length';
import { clamp } from '@/units/math';

export const TIN_CAN_END_RING_HEIGHT_MM = 2.5;
export const TIN_CAN_END_RING_THICKNESS_MM = 1.5;
export const TIN_CAN_LID_INSET_MM = 0.8;
export const TIN_CAN_BEAD_COUNT_MIN = 1;
export const TIN_CAN_BEAD_COUNT_MAX = 20;
export const TIN_CAN_BEAD_COUNT_DEFAULT = 11;

export interface TinCanParams {
  bodyRadiusM: number;
  bodyHeightM: number;
  /** Full sine cycles in the 80 % bead zone (not scaled by height). */
  beadCount: number;
  topEndRingHeightM: number;
  bottomEndRingHeightM: number;
  /** Radial outward step on end rings (double-seam lip). */
  endRingThicknessM: number;
  /** Lid/base disc radius = bodyRadius − inset (sits inside the seam lip). */
  lidInsetM: number;
}

const RADIUS_MIN_M = 25 * MM_TO_M;
const RADIUS_MAX_M = 60 * MM_TO_M;
const HEIGHT_MIN_M = 60 * MM_TO_M;
const HEIGHT_MAX_M = 200 * MM_TO_M;

export function defaultTinCanParams(): TinCanParams {
  return {
    bodyRadiusM: 36.5 * MM_TO_M,
    bodyHeightM: 110 * MM_TO_M,
    beadCount: TIN_CAN_BEAD_COUNT_DEFAULT,
    topEndRingHeightM: TIN_CAN_END_RING_HEIGHT_MM * MM_TO_M,
    bottomEndRingHeightM: TIN_CAN_END_RING_HEIGHT_MM * MM_TO_M,
    endRingThicknessM: TIN_CAN_END_RING_THICKNESS_MM * MM_TO_M,
    lidInsetM: TIN_CAN_LID_INSET_MM * MM_TO_M,
  };
}

export function cloneTinCanParams(params: TinCanParams): TinCanParams {
  return { ...params };
}

export function isTinCanAssetKind(kind: AssetKind): boolean {
  return kind === 'tin-can';
}

export function scaledTinCanParams(params: TinCanParams, sizeScale: number): TinCanParams {
  const s = sizeScale;
  return {
    ...params,
    bodyRadiusM: params.bodyRadiusM * s,
    bodyHeightM: params.bodyHeightM * s,
    topEndRingHeightM: params.topEndRingHeightM * s,
    bottomEndRingHeightM: params.bottomEndRingHeightM * s,
    endRingThicknessM: params.endRingThicknessM * s,
    lidInsetM: params.lidInsetM * s,
  };
}

/** Ring vertical center sits on the can end (y = 0 bottom, y = bodyHeight top). */
export function endRingYBounds(
  params: TinCanParams,
  placement: 'top' | 'bottom',
): { y0: number; y1: number; centerY: number } {
  const h =
    placement === 'bottom'
      ? params.bottomEndRingHeightM
      : params.topEndRingHeightM;
  const half = h * 0.5;
  const centerY = placement === 'bottom' ? 0 : params.bodyHeightM;
  return { y0: centerY - half, y1: centerY + half, centerY };
}

export function tinCanRingOuterRadiusM(params: TinCanParams): number {
  return params.bodyRadiusM + params.endRingThicknessM;
}

export function tinCanLidRadiusM(params: TinCanParams): number {
  return Math.max(params.bodyRadiusM - params.lidInsetM, params.bodyRadiusM * 0.85);
}

export function mantleYBounds(params: TinCanParams): { mantleY0: number; mantleY1: number } {
  const bottomHalf = params.bottomEndRingHeightM * 0.5;
  const topHalf = params.topEndRingHeightM * 0.5;
  return {
    mantleY0: bottomHalf,
    mantleY1: params.bodyHeightM - topHalf,
  };
}

export function labelBandYBounds(params: TinCanParams): {
  labelY0: number;
  labelY1: number;
} {
  const { mantleY0, mantleY1 } = mantleYBounds(params);
  return {
    labelY0: mantleY0,
    labelY1: mantleY1,
  };
}

/** Shift seam-centered layout so ymin = 0 (foot pivot on physical bottom). */
export function tinCanVerticalPivotOffsetM(params: TinCanParams): number {
  return params.bottomEndRingHeightM * 0.5;
}

/** Mesh extent along Y after pivot offset (foot at y = 0). */
export function tinCanMeshHeightM(params: TinCanParams): number {
  return (
    params.bodyHeightM +
    params.bottomEndRingHeightM * 0.5 +
    params.topEndRingHeightM * 0.5
  );
}

export function clampTinCanParams(
  partial: Partial<TinCanParams>,
  base: TinCanParams,
): TinCanParams {
  const merged: TinCanParams = { ...base, ...partial };

  const bodyHeightM = clamp(merged.bodyHeightM, HEIGHT_MIN_M, HEIGHT_MAX_M);
  const bodyRadiusM = clamp(merged.bodyRadiusM, RADIUS_MIN_M, RADIUS_MAX_M);
  const topEndRingHeightM = clamp(
    merged.topEndRingHeightM,
    0.001,
    bodyHeightM * 0.1,
  );
  const bottomEndRingHeightM = clamp(
    merged.bottomEndRingHeightM,
    0.001,
    bodyHeightM * 0.1,
  );
  const beadCount = Math.round(
    clamp(
      merged.beadCount,
      TIN_CAN_BEAD_COUNT_MIN,
      TIN_CAN_BEAD_COUNT_MAX,
    ),
  );
  const endRingThicknessM = clamp(merged.endRingThicknessM, 0.0005, 0.005);
  const lidInsetM = clamp(merged.lidInsetM, 0, endRingThicknessM * 0.9);

  return {
    bodyRadiusM,
    bodyHeightM,
    beadCount,
    topEndRingHeightM,
    bottomEndRingHeightM,
    endRingThicknessM,
    lidInsetM,
  };
}
