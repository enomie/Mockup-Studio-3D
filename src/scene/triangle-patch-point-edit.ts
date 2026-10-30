import {
  isPatchCorner,
  locatePatchEdgeSegment,
  type PatchPoint,
  type PatchParams,
} from './asset-triangle-patch';
import type { Vec3 } from './entity-types';

/** Keeps inserted points away from the ends of a segment so no segment collapses. */
const MIN_SEGMENT_SPLIT = 0.02;

function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function addVec(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subVec(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** Next free point number, from the `pt-N` ids so renamed points never cause duplicates. */
function nextPatchPointNumber(points: readonly PatchPoint[]): number {
  let max = 0;
  for (const point of points) {
    const match = /^pt-(\d+)$/.exec(point.id);
    if (match) {max = Math.max(max, Number(match[1]));}
  }
  return max + 1;
}

/**
 * Inserts a new point on edge `edgeIndex` at edge parameter `t`. The segment is split with
 * de Casteljau, so the edge keeps its shape; the cross tangents are blended from the neighbors.
 */
export function insertPatchPoint(
  params: PatchParams,
  edgeIndex: number,
  t: number,
): { params: PatchParams; pointId: string } {
  const { start, end, s: rawS } = locatePatchEdgeSegment(params, edgeIndex, t);
  const s = Math.min(1 - MIN_SEGMENT_SPLIT, Math.max(MIN_SEGMENT_SPLIT, rawS));

  const p01 = lerpVec(start.pos, start.handleNext, s);
  const p12 = lerpVec(start.handleNext, end.handlePrev, s);
  const p23 = lerpVec(end.handlePrev, end.pos, s);
  const p012 = lerpVec(p01, p12, s);
  const p123 = lerpVec(p12, p23, s);
  const split = lerpVec(p012, p123, s);

  const crossIn = lerpVec(subVec(start.handleCrossIn, start.pos), subVec(end.handleCrossIn, end.pos), s);
  const crossOut = lerpVec(subVec(start.handleCrossOut, start.pos), subVec(end.handleCrossOut, end.pos), s);

  const number = nextPatchPointNumber(params.points);
  const inserted: PatchPoint = {
    id: `pt-${number}`,
    name: `Point ${number}`,
    pos: split,
    handleNext: p123,
    handlePrev: p012,
    handleCrossIn: addVec(split, crossIn),
    handleCrossOut: addVec(split, crossOut),
  };

  const points = params.points.map((point) => {
    if (point.id === start.id) {return { ...point, handleNext: p01 };}
    if (point.id === end.id) {return { ...point, handlePrev: p23 };}
    return point;
  });
  points.splice(points.findIndex((point) => point.id === start.id) + 1, 0, inserted);

  // Store the edge parameter of the clamped split, not the raw click.
  const knotStart = start.id === params.cornerIds[edgeIndex % params.cornerIds.length] ? 0 : params.edgeParams[start.id];
  const knotEnd = end.id === params.cornerIds[(edgeIndex + 1) % params.cornerIds.length] ? 1 : params.edgeParams[end.id];
  const edgeT = knotStart + (knotEnd - knotStart) * s;

  return {
    params: {
      ...params,
      points,
      edgeParams: { ...params.edgeParams, [inserted.id]: edgeT },
    },
    pointId: inserted.id,
  };
}

/** Removes an edge point; its two segments merge into one. Corners cannot be removed. */
export function removePatchPoint(params: PatchParams, pointId: string): PatchParams {
  if (isPatchCorner(params, pointId) || !params.points.some((point) => point.id === pointId)) {
    return params;
  }
  const edgeParams = Object.fromEntries(
    Object.entries(params.edgeParams).filter(([id]) => id !== pointId),
  );
  return {
    ...params,
    points: params.points.filter((point) => point.id !== pointId),
    edgeParams,
  };
}
