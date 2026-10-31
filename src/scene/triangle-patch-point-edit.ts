import {
  isPatchCorner,
  locatePatchEdgeSegment,
  type PatchPoint,
  type PatchParams,
} from './asset-triangle-patch';
import type { Vec3 } from './entity-types';
import { dropEdgeLinksForPoint } from './triangle-patch-edge-link';

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
): InsertedPatchPoint {
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
    edgeTangent: 'smooth',
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
    startPointId: start.id,
    endPointId: end.id,
    s,
  };
}

/** Result of inserting a point: new params, the new point and the segment it split (loop order). */
export interface InsertedPatchPoint {
  params: PatchParams;
  pointId: string;
  startPointId: string;
  endPointId: string;
  /** Split parameter actually used, from `startPointId` (0..1). */
  s: number;
}

/**
 * Inserts a point into the segment between neighbors `aId` and `bId` at curve parameter
 * `sFromA` measured from `aId`. Null when the two points are not neighbors.
 */
export function insertPatchPointInSegment(
  params: PatchParams,
  aId: string,
  bId: string,
  sFromA: number,
): InsertedPatchPoint | null {
  const n = params.points.length;
  const ia = params.points.findIndex((p) => p.id === aId);
  const ib = params.points.findIndex((p) => p.id === bId);
  if (ia < 0 || ib < 0) {return null;}
  let startIndex: number;
  let s: number;
  if ((ia + 1) % n === ib) {
    startIndex = ia;
    s = sFromA;
  } else if ((ib + 1) % n === ia) {
    startIndex = ib;
    s = 1 - sFromA;
  } else {
    return null;
  }
  // Edge = last corner at or before the segment start (walking backwards in the loop).
  let edgeIndex = -1;
  for (let k = 0; k < n && edgeIndex < 0; k++) {
    const id = params.points[(startIndex - k + n) % n].id;
    edgeIndex = params.cornerIds.indexOf(id);
  }
  if (edgeIndex < 0) {return null;}
  const startId = params.points[startIndex].id;
  const endId = params.points[(startIndex + 1) % n].id;
  const knotStart = startId === params.cornerIds[edgeIndex] ? 0 : params.edgeParams[startId];
  const knotEnd = endId === params.cornerIds[(edgeIndex + 1) % params.cornerIds.length] ? 1 : params.edgeParams[endId];
  return insertPatchPoint(params, edgeIndex, knotStart + (knotEnd - knotStart) * s);
}

/** Removes an edge point; its two segments merge into one. Corners cannot be removed. */
export function removePatchPoint(params: PatchParams, pointId: string): PatchParams {
  if (isPatchCorner(params, pointId) || !params.points.some((point) => point.id === pointId)) {
    return params;
  }
  const edgeParams = Object.fromEntries(
    Object.entries(params.edgeParams).filter(([id]) => id !== pointId),
  );
  return dropEdgeLinksForPoint({
    ...params,
    points: params.points.filter((point) => point.id !== pointId),
    edgeParams,
  }, pointId);
}
