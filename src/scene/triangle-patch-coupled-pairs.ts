import { Euler, Quaternion, Vector3 } from 'three';
import { replacePatchPoint, type PatchParams, type PatchPoint } from './asset-triangle-patch';
import type { AssetEntity, EntityTransform, Vec3 } from './entity-types';
import {
  isEdgeLinkValid,
  offSegmentPinkKey,
  sharedAxisAt,
  sharedPointRole,
  type PatchEdgeLink,
  type SharedPointRole,
} from './triangle-patch-edge-link';

/**
 * The two handle pairs at a point on a shared (linked) edge:
 * - yellow: this patch's yellow handle <-> the partner's yellow handle,
 * - pink: at end points this patch's pink handle of the neighboring edge <-> the partner's;
 *   at inner points the forward <-> backward pink handle (shared by both patches).
 * Coupled pairs stay opposite (lengths free); "align opposite (average)" puts a pair
 * back opposite on the average direction of both handles.
 */
export type HandlePair = 'yellow' | 'pink';

type FindEntity = (id: string) => AssetEntity | undefined;

interface SharedPoint {
  entity: AssetEntity;
  params: PatchParams;
  point: PatchPoint;
  links: PatchEdgeLink[];
  role: SharedPointRole;
}

function rotation(transform: EntityTransform): Quaternion {
  const { x, y, z } = transform.rotation;
  return new Quaternion().setFromEuler(new Euler(x, y, z, 'XYZ'));
}

function toWorldVector(v: Vec3, transform: EntityTransform): Vector3 {
  return new Vector3(v.x, v.y, v.z).applyQuaternion(rotation(transform));
}

function toLocalVector(v: Vector3, transform: EntityTransform): Vec3 {
  const r = v.clone().applyQuaternion(rotation(transform).invert());
  return { x: r.x, y: r.y, z: r.z };
}

function vec(v: Vec3): Vector3 {
  return new Vector3(v.x, v.y, v.z);
}

function offset(point: PatchPoint, key: keyof PatchPoint): Vec3 {
  const h = point[key] as Vec3;
  return { x: h.x - point.pos.x, y: h.y - point.pos.y, z: h.z - point.pos.z };
}

function withHandle(point: PatchPoint, key: 'handleNext' | 'handlePrev' | 'handleCrossIn', local: Vec3): PatchPoint {
  return { ...point, [key]: { x: point.pos.x + local.x, y: point.pos.y + local.y, z: point.pos.z + local.z } };
}

/** Valid links of `entity` touching `pointId` and the point's role on the shared edges. */
export function describeSharedPoint(entityId: string, pointId: string, findEntity: FindEntity): SharedPoint | null {
  const entity = findEntity(entityId);
  const params = entity?.patchParams;
  const point = params?.points.find((p) => p.id === pointId);
  if (!entity || !params || !point) {return null;}
  const links = (params.edgeLinks ?? []).filter(
    (l) => (l.startPointId === pointId || l.endPointId === pointId) && isEdgeLinkValid(entity, l, findEntity),
  );
  if (links.length === 0) {return null;}
  return { entity, params, point, links, role: sharedPointRole(params, pointId, links) };
}

function partnerPointId(link: PatchEdgeLink, pointId: string): string {
  return link.startPointId === pointId ? link.partnerStartPointId : link.partnerEndPointId;
}

/**
 * Two vectors put opposite on their average direction (only the part across `axis` when
 * given; the parts along it stay). Lengths are kept. Symmetric in a and b.
 */
export function averageOpposite(a: Vector3, b: Vector3, axis?: Vector3): [Vector3, Vector3] {
  const unitAxis = axis && axis.lengthSq() > 1e-20 ? axis.clone().normalize() : null;
  const alongA = unitAxis ? a.dot(unitAxis) : 0;
  const alongB = unitAxis ? b.dot(unitAxis) : 0;
  const perpA = unitAxis ? a.clone().addScaledVector(unitAxis, -alongA) : a.clone();
  const perpB = unitAxis ? b.clone().addScaledVector(unitAxis, -alongB) : b.clone();
  const la = perpA.length();
  const lb = perpB.length();
  if (la < 1e-12 && lb < 1e-12) {return [a.clone(), b.clone()];}
  const dir = new Vector3();
  if (la > 1e-12) {dir.addScaledVector(perpA, 1 / la);}
  if (lb > 1e-12) {dir.addScaledVector(perpB, -1 / lb);}
  if (dir.lengthSq() < 1e-20) {dir.copy(perpA).normalize();} // a and b point the same way
  dir.normalize();
  const outA = dir.clone().multiplyScalar(la);
  const outB = dir.clone().multiplyScalar(-lb);
  if (unitAxis) {
    outA.addScaledVector(unitAxis, alongA);
    outB.addScaledVector(unitAxis, alongB);
  }
  return [outA, outB];
}

/**
 * "Align opposite (average)" for one pair at a shared point; also couples the pair on both
 * patches. Returns the new points per changed patch (owner and partner).
 */
export function alignSharedPairAverage(
  entityId: string,
  pointId: string,
  pair: HandlePair,
  findEntity: FindEntity,
): Map<string, PatchPoint[]> {
  const updates = new Map<string, PatchPoint[]>();
  const own = describeSharedPoint(entityId, pointId, findEntity);
  if (!own || own.role === 'star') {return updates;}
  const link = own.links[0];
  const partnerId = link.partnerEntityId;
  const partnerPid = partnerPointId(link, pointId);
  const partner = describeSharedPoint(partnerId, partnerPid, findEntity);
  if (!partner || partner.role === 'star') {return updates;}

  const axisLocal = sharedAxisAt(own.point, own.role, own.params, link);
  const axis = axisLocal ? toWorldVector(axisLocal, own.entity.transform) : undefined;
  let ownPoint = own.point;
  let partnerPoint = partner.point;

  if (pair === 'yellow') {
    const [a, b] = averageOpposite(
      toWorldVector(offset(ownPoint, 'handleCrossIn'), own.entity.transform),
      toWorldVector(offset(partnerPoint, 'handleCrossIn'), partner.entity.transform),
      axis,
    );
    ownPoint = { ...withHandle(ownPoint, 'handleCrossIn', toLocalVector(a, own.entity.transform)), joint: 'smooth' };
    partnerPoint = { ...withHandle(partnerPoint, 'handleCrossIn', toLocalVector(b, partner.entity.transform)), joint: 'smooth' };
  } else if (own.role === 'end' && partner.role === 'end') {
    const ownKey = offSegmentPinkKey(own.params, pointId, link);
    const partnerLink = partner.links[0];
    const partnerKey = offSegmentPinkKey(partner.params, partnerPid, partnerLink);
    if (!ownKey || !partnerKey) {return updates;}
    const [a, b] = averageOpposite(
      toWorldVector(offset(ownPoint, ownKey), own.entity.transform),
      toWorldVector(offset(partnerPoint, partnerKey), partner.entity.transform),
      axis,
    );
    ownPoint = { ...withHandle(ownPoint, ownKey, toLocalVector(a, own.entity.transform)), pinkPair: 'coupled' };
    partnerPoint = { ...withHandle(partnerPoint, partnerKey, toLocalVector(b, partner.entity.transform)), pinkPair: 'coupled' };
  } else {
    // Inner point: forward and backward pink of this patch; the partner shares them (edge sync).
    const [a, b] = averageOpposite(
      vec(offset(ownPoint, 'handleNext')),
      vec(offset(ownPoint, 'handlePrev')),
    );
    ownPoint = { ...withHandle(withHandle(ownPoint, 'handleNext', a), 'handlePrev', b), pinkPair: 'coupled' };
    partnerPoint = { ...partnerPoint, pinkPair: 'coupled' };
  }

  updates.set(own.entity.id, replacePatchPoint(own.params.points, ownPoint));
  updates.set(partner.entity.id, replacePatchPoint(partner.params.points, partnerPoint));
  return updates;
}

/** Which pair a handle of a shared point belongs to (for Shift + drag), or null. */
export function pairOfHandle(params: PatchParams, pointId: string, key: string): HandlePair | null {
  const links = (params.edgeLinks ?? []).filter((l) => l.startPointId === pointId || l.endPointId === pointId);
  if (links.length === 0) {return null;}
  if (key === 'handleCrossIn' || key === 'handleCrossOut') {return 'yellow';}
  const role = sharedPointRole(params, pointId, links);
  if (role === 'inner') {return key === 'handleNext' || key === 'handlePrev' ? 'pink' : null;}
  if (role === 'end') {return offSegmentPinkKey(params, pointId, links[0]) === key ? 'pink' : null;}
  return null;
}

/**
 * Coupled pink pair at an inner shared point: after `movedKey` changed, the other pink
 * handle turns opposite and keeps its length. Everything else: unchanged.
 */
export function applyInnerPinkCoupling(params: PatchParams, point: PatchPoint, movedKey: string): PatchPoint {
  if (point.pinkPair !== 'coupled' || (movedKey !== 'handleNext' && movedKey !== 'handlePrev')) {return point;}
  const links = (params.edgeLinks ?? []).filter((l) => l.startPointId === point.id || l.endPointId === point.id);
  if (sharedPointRole(params, point.id, links) !== 'inner') {return point;}
  const otherKey = movedKey === 'handleNext' ? 'handlePrev' : 'handleNext';
  const moved = offset(point, movedKey);
  const other = offset(point, otherKey);
  const movedLen = Math.hypot(moved.x, moved.y, moved.z);
  if (movedLen < 1e-9) {return point;}
  const k = -Math.hypot(other.x, other.y, other.z) / movedLen;
  return withHandle(point, otherKey, { x: moved.x * k, y: moved.y * k, z: moved.z * k });
}
