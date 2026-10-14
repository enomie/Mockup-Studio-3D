import type { AssetKind } from './asset-kind';
import { MM_TO_M } from '@/units/length';

export interface FabricClothParams {
  borderEnabled: boolean;
  borderWidthM: number;
  borderColor: string;
}

export const FABRIC_CLOTH_REF_WIDTH_M = 0.45;
export const FABRIC_CLOTH_PLACEHOLDER_ASPECT = 1;
export const FABRIC_CLOTH_BORDER_WIDTH_M = 0.002;
export const FABRIC_CLOTH_BORDER_WIDTH_MIN_M = 0.5 * MM_TO_M;
export const FABRIC_CLOTH_BORDER_WIDTH_MAX_M = 50 * MM_TO_M;
/** Roughness on inset border strip (solid trim look). */
export const FABRIC_CLOTH_BORDER_ROUGHNESS = 0.65;
/** Thin mesh extent for foot-pivot height (not visible thickness goal). */
export const FABRIC_CLOTH_MESH_THICKNESS_M = 0.001;

/** Frozen rest-plane coordinates (meters) for border TSL — not updated during physics sync. */
export const FABRIC_CLOTH_REST_PLANE_XY_ATTR = 'restPlaneXY';

const DEFAULT_BORDER_COLOR = '#3a3a3a';

export function defaultFabricClothParams(): FabricClothParams {
  return {
    borderEnabled: false,
    borderWidthM: FABRIC_CLOTH_BORDER_WIDTH_M,
    borderColor: DEFAULT_BORDER_COLOR,
  };
}

export function cloneFabricClothParams(params: FabricClothParams): FabricClothParams {
  return { ...params };
}

export function isFabricClothAssetKind(kind: AssetKind): boolean {
  return kind === 'fabric-cloth';
}

function clampBorderWidthM(value: number): number {
  if (!Number.isFinite(value)) {return FABRIC_CLOTH_BORDER_WIDTH_M;}
  return Math.min(
    FABRIC_CLOTH_BORDER_WIDTH_MAX_M,
    Math.max(FABRIC_CLOTH_BORDER_WIDTH_MIN_M, value),
  );
}

export function clampFabricClothParams(
  partial: Partial<FabricClothParams>,
  base: FabricClothParams,
): FabricClothParams {
  return {
    borderEnabled: partial.borderEnabled ?? base.borderEnabled,
    borderWidthM: clampBorderWidthM(
      partial.borderWidthM ?? base.borderWidthM,
    ),
    borderColor:
      typeof partial.borderColor === 'string' && partial.borderColor.length > 0
        ? partial.borderColor
        : base.borderColor,
  };
}
