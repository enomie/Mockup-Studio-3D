import {
  extractLathePathPointsBySlot,
  type LathePathSlot,
  type LatheSvgPoint2,
} from './lathe-svg-path-slots';

/** Axis-aligned bounds in SVG units (1 unit = 1 mm, y down). */
export interface LatheBoundsMm {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Measured sizes of one lathe SVG: union of all slots plus each slot (null when absent; 10 entries). */
export interface LatheSvgMetricsMm {
  bounds: LatheBoundsMm;
  slots: (LatheBoundsMm | null)[];
}

const round4 = (n: number): number => {
  const r = Math.round(n * 10000) / 10000;
  return r === 0 ? 0 : r;
};

function latheBoundsOfPoints(points: LatheSvgPoint2[]): LatheBoundsMm | null {
  if (points.length === 0) {
    return null;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX: round4(minX), maxX: round4(maxX), minY: round4(minY), maxY: round4(maxY) };
}

export function measureLatheSvgMm(svgText: string, curveSegments = 64): LatheSvgMetricsMm {
  const slotPoints = extractLathePathPointsBySlot(svgText, curveSegments);
  const slots = slotPoints.map(latheBoundsOfPoints);
  const bounds = latheBoundsOfPoints(slotPoints.flat());
  if (bounds === null) {
    throw new Error('Lathe SVG has no slot paths');
  }
  return { bounds, slots };
}

export function latheSlotBounds(metrics: LatheSvgMetricsMm, slot: LathePathSlot): LatheBoundsMm {
  const b = metrics.slots[slot] ?? null;
  if (b === null) {
    throw new Error(`Lathe SVG slot ${slot} missing`);
  }
  return b;
}
