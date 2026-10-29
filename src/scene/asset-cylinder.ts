import type { AssetKind } from './asset-kind';
import { MM_TO_M } from '@/units/length';
import { clamp } from '@/units/math';

export interface CylinderParams {
  radiusM: number;
  heightM: number;
  cornerRadiusMm: number;
}

const DIM_MIN = 0.01;
const DIM_MAX = 20;
const CORNER_RADIUS_MM_MIN = 0;
const CORNER_EPSILON_M = 0.0001;

export function defaultCylinderParams(): CylinderParams {
  return {
    radiusM: 0.15,
    heightM: 0.3,
    cornerRadiusMm: 5,
  };
}

export function cloneCylinderParams(params: CylinderParams): CylinderParams {
  return { ...params };
}

export function isCylinderAssetKind(kind: AssetKind): kind is 'cylinder' {
  return kind === 'cylinder';
}

export function clampCylinderParams(
  partial: Partial<CylinderParams>,
  base: CylinderParams,
): CylinderParams {
  const radiusM = clamp(partial.radiusM ?? base.radiusM, DIM_MIN, DIM_MAX);
  const heightM = clamp(partial.heightM ?? base.heightM, DIM_MIN, DIM_MAX);
  const merged = {
    radiusM,
    heightM,
    cornerRadiusMm: partial.cornerRadiusMm ?? base.cornerRadiusMm,
  };
  const maxCornerMm = Math.min(radiusM * 1000, heightM * 500);
  return {
    ...merged,
    cornerRadiusMm: clamp(merged.cornerRadiusMm, CORNER_RADIUS_MM_MIN, maxCornerMm),
  };
}

/** Fillet at top/bottom circular edges (meters). */
export function effectiveCylinderCornerRadiusM(params: CylinderParams): number {
  const radiusM = params.cornerRadiusMm * MM_TO_M;
  const maxRadius = Math.min(params.radiusM, params.heightM * 0.5) - CORNER_EPSILON_M;
  return Math.max(0, Math.min(radiusM, maxRadius));
}
