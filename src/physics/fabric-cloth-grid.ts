import { clamp } from '@/units/math';
import {
  FABRIC_CLOTH_SIM_CELL_SIZE_M,
  FABRIC_CLOTH_SIM_MAX_SEGMENTS_PER_AXIS,
  FABRIC_CLOTH_SIM_MIN_SEGMENTS_PER_AXIS,
} from './constants';

export interface FabricClothGridSegments {
  segmentsW: number;
  segmentsH: number;
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
): FabricClothGridSegments {
  const cellSizeM = FABRIC_CLOTH_SIM_CELL_SIZE_M;
  return {
    segmentsW: segmentsForExtent(widthM, cellSizeM),
    segmentsH: segmentsForExtent(heightM, cellSizeM),
  };
}
