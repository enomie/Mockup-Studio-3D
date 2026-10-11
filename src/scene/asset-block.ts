import type { AssetKind } from './asset-kind';
import { MM_TO_M } from '@/units/length';
import { clamp } from '@/units/math';

export type BlockParams = {
  widthM: number;
  heightM: number;
  depthM: number;
  cornerRadiusMm: number;
};

const BLOCK_DIM_MIN = 0.01;
const BLOCK_DIM_MAX = 20;
const CORNER_RADIUS_MM_MIN = 0;
const CORNER_EPSILON_M = 0.0001;

export function defaultBlockParams(): BlockParams {
  return {
    widthM: 1,
    heightM: 1,
    depthM: 1,
    cornerRadiusMm: 5,
  };
}

export function cloneBlockParams(params: BlockParams): BlockParams {
  return { ...params };
}

export function isBlockAssetKind(kind: AssetKind): boolean {
  return kind === 'block';
}

export function clampBlockParams(
  partial: Partial<BlockParams>,
  base: BlockParams,
): BlockParams {
  const widthM = clamp(partial.widthM ?? base.widthM, BLOCK_DIM_MIN, BLOCK_DIM_MAX);
  const heightM = clamp(partial.heightM ?? base.heightM, BLOCK_DIM_MIN, BLOCK_DIM_MAX);
  const depthM = clamp(partial.depthM ?? base.depthM, BLOCK_DIM_MIN, BLOCK_DIM_MAX);
  const merged = { widthM, heightM, depthM, cornerRadiusMm: partial.cornerRadiusMm ?? base.cornerRadiusMm };
  const maxCornerMm = Math.min(widthM, heightM, depthM) * 500;
  return {
    ...merged,
    cornerRadiusMm: clamp(
      merged.cornerRadiusMm,
      CORNER_RADIUS_MM_MIN,
      maxCornerMm,
    ),
  };
}

/** Corner fillet radius in meters, clamped to half the smallest edge. */
export function effectiveBlockCornerRadiusM(params: BlockParams): number {
  const radiusM = params.cornerRadiusMm * MM_TO_M;
  const maxRadius =
    Math.min(params.widthM, params.heightM, params.depthM) * 0.5 - CORNER_EPSILON_M;
  return Math.max(0, Math.min(radiusM, maxRadius));
}
