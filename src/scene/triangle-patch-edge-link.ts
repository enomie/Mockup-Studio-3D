import { Euler, Quaternion, Vector3 } from 'three';
import { replacePatchPoint, type PatchParams, type PatchPoint } from './asset-triangle-patch';
import type { AssetEntity, EntityTransform, Vec3 } from './entity-types';

/**
 * A patch edge segment: two neighboring boundary points. Stored in both linked patches;
 * `startPointId` pairs with `partnerStartPointId`, `endPointId` with `partnerEndPointId`.
 */
export interface PatchEdgeLink {
  startPointId: string;
  endPointId: string;
  partnerEntityId: string;
  partnerStartPointId: string;
  partnerEndPointId: string;
}

export interface PatchSegment {
  startPointId: string;
  endPointId: string;
}

type SegmentHandleKey = 'handleNext' | 'handlePrev';

/** Segments of the boundary loop in panel order (each point to the next, last to first). */
export function listPatchSegments(params: PatchParams): PatchSegment[] {
  const { points } = params;
  return points.map((point, i) => ({
    startPointId: point.id,
    endPointId: points[(i + 1) % points.length].id,
  }));
}

/**
 * Handle keys pointing into the segment a–b, or null when the points are not neighbors.
 * In loop order a uses handleNext and b handlePrev; reversed it is the other way round.
 */
export function segmentHandleKeys(
  params: PatchParams,
  aId: string,
  bId: string,
): { a: SegmentHandleKey; b: SegmentHandleKey } | null {
  const n = params.points.length;
  const ia = params.points.findIndex((p) => p.id === aId);
  const ib = params.points.findIndex((p) => p.id === bId);
  if (ia < 0 || ib < 0 || ia === ib) {return null;}
  if ((ia + 1) % n === ib) {return { a: 'handleNext', b: 'handlePrev' };}
  if ((ib + 1) % n === ia) {return { a: 'handlePrev', b: 'handleNext' };}
  return null;
}

function rotationOf(transform: EntityTransform): Quaternion {
  const { x, y, z } = transform.rotation;
  return new Quaternion().setFromEuler(new Euler(x, y, z, 'XYZ'));
}

function toWorld(v: Vec3, t: EntityTransform): Vector3 {
  return new Vector3(v.x, v.y, v.z)
    .applyQuaternion(rotationOf(t))
    .add(new Vector3(t.position.x, t.position.y, t.position.z));
}

function toLocal(v: Vector3, t: EntityTransform): Vec3 {
  const local = v.clone()
    .sub(new Vector3(t.position.x, t.position.y, t.position.z))
    .applyQuaternion(rotationOf(t).invert());
  return { x: local.x, y: local.y, z: local.z };
}

/** World-space shape of a segment: both anchors and the handles pointing into it. */
export interface EdgeShape {
  start: Vec3;
  startHandle: Vec3;
  end: Vec3;
  endHandle: Vec3;
}

export function captureEdgeShape(
  params: PatchParams,
  transform: EntityTransform,
  segment: PatchSegment,
): EdgeShape | null {
  const keys = segmentHandleKeys(params, segment.startPointId, segment.endPointId);
  const a = params.points.find((p) => p.id === segment.startPointId);
  const b = params.points.find((p) => p.id === segment.endPointId);
  if (!keys || !a || !b) {return null;}
  const w = (v: Vec3) => { const r = toWorld(v, transform); return { x: r.x, y: r.y, z: r.z }; };
  return { start: w(a.pos), startHandle: w(a[keys.a]), end: w(b.pos), endHandle: w(b[keys.b]) };
}

export function reverseEdgeShape(shape: EdgeShape): EdgeShape {
  return { start: shape.end, startHandle: shape.endHandle, end: shape.start, endHandle: shape.startHandle };
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** True when `shape` matches the target segment better reversed (nearest end points). */
export function shouldReverseForTarget(shape: EdgeShape, target: EdgeShape): boolean {
  const straight = dist(shape.start, target.start) + dist(shape.end, target.end);
  const crossed = dist(shape.start, target.end) + dist(shape.end, target.start);
  return crossed < straight - 1e-9;
}

/** Moves a point's anchor to `pos` (all handles move along), then sets one handle exactly. */
function placePoint(point: PatchPoint, pos: Vec3, key: SegmentHandleKey, handle: Vec3): PatchPoint {
  const d = { x: pos.x - point.pos.x, y: pos.y - point.pos.y, z: pos.z - point.pos.z };
  const shift = (v: Vec3) => ({ x: v.x + d.x, y: v.y + d.y, z: v.z + d.z });
  return {
    ...point,
    pos,
    handleNext: shift(point.handleNext),
    handlePrev: shift(point.handlePrev),
    handleCrossIn: shift(point.handleCrossIn),
    handleCrossOut: shift(point.handleCrossOut),
    [key]: handle,
  };
}

/**
 * Applies a world-space edge shape to a segment of a patch (shape.start -> segment start).
 * Returns the new points, or null when the segment does not exist.
 */
export function applyEdgeShape(
  params: PatchParams,
  transform: EntityTransform,
  segment: PatchSegment,
  shape: EdgeShape,
): PatchPoint[] | null {
  const keys = segmentHandleKeys(params, segment.startPointId, segment.endPointId);
  const a = params.points.find((p) => p.id === segment.startPointId);
  const b = params.points.find((p) => p.id === segment.endPointId);
  if (!keys || !a || !b) {return null;}
  const l = (v: Vec3) => toLocal(new Vector3(v.x, v.y, v.z), transform);
  let points = replacePatchPoint(params.points, placePoint(a, l(shape.start), keys.a, l(shape.startHandle)));
  const bNow = points.find((p) => p.id === b.id) ?? b;
  points = replacePatchPoint(points, placePoint(bNow, l(shape.end), keys.b, l(shape.endHandle)));
  return points;
}

/** A link that still makes sense: partner exists, both segments are neighbors, partner links back. */
export function isEdgeLinkValid(
  owner: AssetEntity,
  link: PatchEdgeLink,
  findEntity: (id: string) => AssetEntity | undefined,
): boolean {
  const own = owner.patchParams;
  const partner = findEntity(link.partnerEntityId)?.patchParams;
  if (!own || !partner) {return false;}
  if (!segmentHandleKeys(own, link.startPointId, link.endPointId)) {return false;}
  if (!segmentHandleKeys(partner, link.partnerStartPointId, link.partnerEndPointId)) {return false;}
  return (partner.edgeLinks ?? []).some((back) =>
    back.partnerEntityId === owner.id &&
    back.startPointId === link.partnerStartPointId &&
    back.endPointId === link.partnerEndPointId &&
    back.partnerStartPointId === link.startPointId &&
    back.partnerEndPointId === link.endPointId,
  );
}

type CrossHandleKey = 'handleCrossIn' | 'handleNext' | 'handlePrev';

/**
 * The handle that decides how the surface leaves the shared edge at `pointId`
 * ("cross handle"): the yellow handle at edge points, the other edge's pink handle at
 * corners. Null where the point is shared by more than one edge line (star points).
 */
export function crossHandleKeyAt(
  params: PatchParams,
  pointId: string,
  segment: PatchSegment,
  linkCount: number,
): CrossHandleKey | null {
  const corner = params.cornerIds.includes(pointId);
  if (!corner) {return linkCount <= 2 ? 'handleCrossIn' : null;}
  if (linkCount > 1) {return null;}
  const other = segment.startPointId === pointId ? segment.endPointId : segment.startPointId;
  const keys = segmentHandleKeys(params, pointId, other);
  if (!keys) {return null;}
  return keys.a === 'handleNext' ? 'handlePrev' : 'handleNext';
}

/** Removes links of `params` that touch `pointId` (used when the point is deleted). */
export function dropEdgeLinksForPoint(params: PatchParams, pointId: string): PatchParams {
  if (!params.edgeLinks) {return params;}
  const edgeLinks = params.edgeLinks.filter((l) => l.startPointId !== pointId && l.endPointId !== pointId);
  return edgeLinks.length === params.edgeLinks.length ? params : { ...params, edgeLinks };
}

/** Same segment regardless of direction. */
export function isSameSegment(link: PatchSegment, segment: PatchSegment): boolean {
  return (
    (link.startPointId === segment.startPointId && link.endPointId === segment.endPointId) ||
    (link.startPointId === segment.endPointId && link.endPointId === segment.startPointId)
  );
}
