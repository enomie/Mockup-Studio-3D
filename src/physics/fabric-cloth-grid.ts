import { clamp } from '@/units/math';
import {
  FABRIC_CLOTH_SIM_CELL_SIZE_DRAFT_M,
  FABRIC_CLOTH_SIM_CELL_SIZE_HIGH_M,
  FABRIC_CLOTH_SIM_CELL_SIZE_STANDARD_M,
  FABRIC_CLOTH_SIM_MAX_SEGMENTS_PER_AXIS,
  FABRIC_CLOTH_SIM_MIN_SEGMENTS_PER_AXIS,
} from './constants';

export type FabricClothSimQuality = 'draft' | 'standard' | 'high';

export const DEFAULT_FABRIC_CLOTH_SIM_QUALITY: FabricClothSimQuality = 'high';

export interface FabricClothGridSegments {
  segmentsW: number;
  segmentsH: number;
}

function cellSizeForQuality(quality: FabricClothSimQuality): number {
  switch (quality) {
    case 'draft':
      return FABRIC_CLOTH_SIM_CELL_SIZE_DRAFT_M;
    case 'high':
      return FABRIC_CLOTH_SIM_CELL_SIZE_HIGH_M;
    case 'standard':
    default:
      return FABRIC_CLOTH_SIM_CELL_SIZE_STANDARD_M;
  }
}

function segmentsForExtent(extentM: number, cellSizeM: number): number {
  if (!Number.isFinite(extentM) || extentM <= 0) {
    return FABRIC_CLOTH_SIM_MIN_SEGMENTS_PER_AXIS;
  }
  if (!Number.isFinite(cellSizeM) || cellSizeM <= 0) {
    return FABRIC_CLOTH_SIM_MIN_SEGMENTS_PER_AXIS;
  }
  const raw = Math.round(extentM / cellSizeM);
  return clamp(
    raw,
    FABRIC_CLOTH_SIM_MIN_SEGMENTS_PER_AXIS,
    FABRIC_CLOTH_SIM_MAX_SEGMENTS_PER_AXIS,
  );
}

/** Grid cell counts for PlaneGeometry widthSegments / heightSegments. */
export function fabricClothGridSegments(
  widthM: number,
  heightM: number,
  quality: FabricClothSimQuality = DEFAULT_FABRIC_CLOTH_SIM_QUALITY,
): FabricClothGridSegments {
  const cellSizeM = cellSizeForQuality(quality);
  return {
    segmentsW: segmentsForExtent(widthM, cellSizeM),
    segmentsH: segmentsForExtent(heightM, cellSizeM),
  };
}
