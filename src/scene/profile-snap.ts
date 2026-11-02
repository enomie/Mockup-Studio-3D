import type { ProfileVec2 } from './profile-model';

export type SnapKind = 'point' | 'axis' | 'grid' | 'none';

export interface SnapOptions {
  grid: boolean;
  /** Snap to points and to the axes x = 0 / y = 0. */
  points: boolean;
  /** Grid step in mm (the visible grid). */
  gridStepMm: number;
  /** Snap radius in mm (screen radius / scale). */
  radiusMm: number;
  /** Points to snap to (the dragged point excluded by the caller). */
  targets: readonly ProfileVec2[];
}

export interface SnapResult {
  point: ProfileVec2;
  /** What x and y snapped to (axes and grid snap each direction on its own). */
  kindX: SnapKind;
  kindY: SnapKind;
  /** The point snapped to, when `kindX === 'point'`. */
  target?: ProfileVec2;
}

function snapAxisValue(
  value: number,
  options: SnapOptions,
): { value: number; kind: SnapKind } {
  if (options.points && Math.abs(value) <= options.radiusMm) {
    return { value: 0, kind: 'axis' };
  }
  if (options.grid && options.gridStepMm > 0) {
    const snapped = Math.round(value / options.gridStepMm) * options.gridStepMm;
    return { value: snapped === 0 ? 0 : snapped, kind: 'grid' };
  }
  return { value, kind: 'none' };
}

/**
 * Snaps a point (mm): a nearby point wins, then the axes, then the grid. Axes and grid
 * snap x and y independently.
 */
export function snapPoint(point: ProfileVec2, options: SnapOptions): SnapResult {
  if (options.points) {
    let best: ProfileVec2 | undefined;
    let bestDistance = options.radiusMm;
    for (const target of options.targets) {
      const distance = Math.hypot(target.x - point.x, target.y - point.y);
      if (distance <= bestDistance) {
        best = target;
        bestDistance = distance;
      }
    }
    if (best) {
      return { point: { x: best.x, y: best.y }, kindX: 'point', kindY: 'point', target: best };
    }
  }
  const x = snapAxisValue(point.x, options);
  const y = snapAxisValue(point.y, options);
  return { point: { x: x.value, y: y.value }, kindX: x.kind, kindY: y.kind };
}
