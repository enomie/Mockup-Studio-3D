import type { GridPaperUnit, ProceduralProfileId } from '@/scene/material-types';
import { normalizeProceduralProfile } from './procedural-profile';

export const GRID_MAJOR_EVERY_MINOR_CELLS = 5;

const UNIT_TO_LINES_PER_M: Record<GridPaperUnit, number> = {
  mm: 1000,
  cm: 100,
  dm: 10,
  m: 1,
};

export function isGridPaperProfileId(profile: ProceduralProfileId | undefined): boolean {
  const resolved = profile ? normalizeProceduralProfile(profile) : undefined;
  return resolved === 'grid-paper-opaque' || resolved === 'grid-paper-lines';
}

export function gridUnitToTileScale(unit: GridPaperUnit): number {
  return UNIT_TO_LINES_PER_M[unit];
}

export function tileScaleToGridUnit(tileScale: number): GridPaperUnit {
  const candidates: GridPaperUnit[] = ['mm', 'cm', 'dm', 'm'];
  let best: GridPaperUnit = 'mm';
  let bestDelta = Infinity;
  for (const unit of candidates) {
    const target = UNIT_TO_LINES_PER_M[unit];
    const delta = Math.abs(tileScale - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = unit;
    }
  }
  return best;
}

export function resolveGridPaperUnit(
  gridUnit: GridPaperUnit | undefined,
  tileScale: number | undefined,
): GridPaperUnit {
  if (gridUnit) {
    return gridUnit;
  }
  if (tileScale !== undefined) {
    return tileScaleToGridUnit(tileScale);
  }
  return 'mm';
}

export function resolveGridPaperTileScale(
  gridUnit: GridPaperUnit | undefined,
  tileScale: number | undefined,
): number {
  return gridUnitToTileScale(resolveGridPaperUnit(gridUnit, tileScale));
}
