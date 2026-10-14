import type { AssetKind } from './asset-kind';
import { clamp } from '@/units/math';

export interface SphereParams {
  radiusM: number;
}

const RADIUS_MIN = 0.01;
const RADIUS_MAX = 10;

export function defaultSphereParams(): SphereParams {
  return { radiusM: 0.15 };
}

export function cloneSphereParams(params: SphereParams): SphereParams {
  return { ...params };
}

export function isSphereAssetKind(kind: AssetKind): boolean {
  return kind === 'sphere';
}

export function clampSphereParams(
  partial: Partial<SphereParams>,
  base: SphereParams,
): SphereParams {
  return {
    radiusM: clamp(partial.radiusM ?? base.radiusM, RADIUS_MIN, RADIUS_MAX),
  };
}
