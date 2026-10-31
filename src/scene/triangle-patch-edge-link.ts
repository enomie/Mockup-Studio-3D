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

const EPSILON = 1e-9;

function pointsDiffer(a: readonly PatchPoint[], b: readonly PatchPoint[]): boolean {
  if (a.length !== b.length) {return true;}
  const keys = ['pos', 'handleNext', 'handlePrev', 'handleCrossIn', 'handleCrossOut'] as const;
  return a.some((p, i) => p.joint !== b[i].joint || keys.some((k) => dist(p[k], b[i][k]) > EPSILON));
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

/** Rotates a local direction vector into world space (or back with `inverse`). */
function rotateVector(v: Vec3, transform: EntityTransform, inverse = false): Vector3 {
  const q = rotationOf(transform);
  return new Vector3(v.x, v.y, v.z).applyQuaternion(inverse ? q.invert() : q);
}

/** Valid links of `entity` touching `pointId`. */
function linksAtPoint(
  entity: AssetEntity,
  params: PatchParams,
  pointId: string,
  findEntity: (id: string) => AssetEntity | undefined,
): PatchEdgeLink[] {
  const owner = { ...entity, patchParams: params };
  return (params.edgeLinks ?? []).filter(
    (l) => (l.startPointId === pointId || l.endPointId === pointId) && isEdgeLinkValid(owner, l, findEntity),
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

/**
 * Smooth joint rule: turns the partner's cross handle around the shared edge axis so its
 * part across the axis points exactly opposite the source's. The partner keeps the length
 * of that part and its part along the axis.
 */
export function alignSmoothCrossHandle(
  source: { point: PatchPoint; key: CrossHandleKey; transform: EntityTransform; axis: Vec3 },
  partner: { point: PatchPoint; key: CrossHandleKey; transform: EntityTransform },
): PatchPoint | null {
  const axis = rotateVector(source.axis, source.transform);
  if (axis.lengthSq() < 1e-20) {return null;}
  axis.normalize();
  const hs = rotateVector(sub(source.point[source.key], source.point.pos), source.transform);
  const perpS = hs.clone().addScaledVector(axis, -hs.dot(axis));
  const perpSLen = perpS.length();
  if (perpSLen < 1e-9) {return null;}

  const hp = rotateVector(sub(partner.point[partner.key], partner.point.pos), partner.transform);
  const alongP = hp.dot(axis);
  const perpPLen = hp.clone().addScaledVector(axis, -alongP).length();
  const length = perpPLen > 1e-9 ? perpPLen : perpSLen;
  const world = axis.clone().multiplyScalar(alongP).addScaledVector(perpS, -length / perpSLen);
  const local = rotateVector({ x: world.x, y: world.y, z: world.z }, partner.transform, true);
  const pos = partner.point.pos;
  const next: PatchPoint = {
    ...partner.point,
    [partner.key]: { x: pos.x + local.x, y: pos.y + local.y, z: pos.z + local.z },
  };
  if (partner.key === 'handleCrossIn') {
    // Keep the (geometry-free) out handle opposite, as the inspector does.
    const out = sub(partner.point.handleCrossOut, pos);
    const outLen = Math.hypot(out.x, out.y, out.z);
    const inLen = local.length();
    if (inLen > 1e-12) {
      const k = -outLen / inLen;
      next.handleCrossOut = { x: pos.x + local.x * k, y: pos.y + local.y * k, z: pos.z + local.z * k };
    }
  }
  return next;
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** Applies the smooth joints of `link` from the source patch onto the partner points. */
function applyJoints(
  source: AssetEntity,
  sourceParams: PatchParams,
  partner: AssetEntity,
  partnerParams: PatchParams,
  link: PatchEdgeLink,
  findEntity: (id: string) => AssetEntity | undefined,
): PatchPoint[] {
  let points = partnerParams.points;
  const pairs: [string, string][] = [
    [link.startPointId, link.partnerStartPointId],
    [link.endPointId, link.partnerEndPointId],
  ];
  const segment = { startPointId: link.startPointId, endPointId: link.endPointId };
  const partnerSegment = { startPointId: link.partnerStartPointId, endPointId: link.partnerEndPointId };
  for (const [sId, pId] of pairs) {
    const sPoint = sourceParams.points.find((p) => p.id === sId);
    const pPoint = points.find((p) => p.id === pId);
    if (!sPoint || !pPoint) {continue;}
    const joint = sPoint.joint ?? 'corner';
    let nextPoint: PatchPoint = pPoint.joint === sPoint.joint ? pPoint : { ...pPoint, joint };
    if (joint === 'smooth') {
      const sKey = crossHandleKeyAt(sourceParams, sId, segment, linksAtPoint(source, sourceParams, sId, findEntity).length);
      const currentPartner = { ...partnerParams, points };
      const pKey = crossHandleKeyAt(currentPartner, pId, partnerSegment, linksAtPoint(partner, currentPartner, pId, findEntity).length);
      const keys = segmentHandleKeys(sourceParams, sId, sId === segment.startPointId ? segment.endPointId : segment.startPointId);
      if (sKey && pKey && keys) {
        // Edge points: one axis through the point (pink to pink) so both of its links agree.
        const axis = sKey === 'handleCrossIn'
          ? sub(sPoint.handleNext, sPoint.handlePrev)
          : sub(sPoint[keys.a], sPoint.pos);
        const aligned = alignSmoothCrossHandle(
          { point: sPoint, key: sKey, transform: source.transform, axis },
          { point: nextPoint, key: pKey, transform: partner.transform },
        );
        if (aligned) {nextPoint = aligned;}
      }
    }
    if (nextPoint !== pPoint) {points = replacePatchPoint(points, nextPoint);}
  }
  return points;
}

/**
 * Brings every patch linked to `sourceId` (and further along chains) in line with it:
 * shared edges and, at smooth joints, the cross handles. All links to one partner are
 * applied together; each patch is visited once. Returns the new points per changed entity.
 */
export function propagateEdgeLinks(
  sourceIds: readonly string[],
  findEntity: (id: string) => AssetEntity | undefined,
): Map<string, PatchPoint[]> {
  const updated = new Map<string, PatchPoint[]>();
  const visited = new Set<string>(sourceIds);
  const queue = [...sourceIds];

  const paramsOf = (entity: AssetEntity): PatchParams | undefined => {
    const points = updated.get(entity.id);
    return entity.patchParams && points ? { ...entity.patchParams, points } : entity.patchParams;
  };
  const current = (id: string): AssetEntity | undefined => {
    const entity = findEntity(id);
    const params = entity ? paramsOf(entity) : undefined;
    return entity && params ? { ...entity, patchParams: params } : entity;
  };

  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    const source = current(id);
    const sourceParams = source?.patchParams;
    if (!source || !sourceParams) {continue;}
    const partnerIds = [...new Set((sourceParams.edgeLinks ?? []).map((l) => l.partnerEntityId))];
    for (const partnerId of partnerIds) {
      if (visited.has(partnerId)) {continue;}
      const partner = current(partnerId);
      const partnerParams = partner?.patchParams;
      if (!partner || !partnerParams) {continue;}
      let points = partnerParams.points;
      for (const link of sourceParams.edgeLinks ?? []) {
        if (link.partnerEntityId !== partnerId || !isEdgeLinkValid(source, link, current)) {continue;}
        const shape = captureEdgeShape(sourceParams, source.transform, {
          startPointId: link.startPointId,
          endPointId: link.endPointId,
        });
        if (!shape) {continue;}
        const shaped = applyEdgeShape({ ...partnerParams, points }, partner.transform, {
          startPointId: link.partnerStartPointId,
          endPointId: link.partnerEndPointId,
        }, shape);
        if (shaped) {points = shaped;}
        points = applyJoints(source, sourceParams, partner, { ...partnerParams, points }, link, current);
      }
      if (!pointsDiffer(points, partnerParams.points)) {continue;}
      updated.set(partnerId, points);
      visited.add(partnerId);
      queue.push(partnerId);
    }
  }
  return updated;
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
