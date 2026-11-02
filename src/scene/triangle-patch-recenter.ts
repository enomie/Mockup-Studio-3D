import type { PatchParams, PatchPoint } from './asset-triangle-patch';
import type { EntityTransform, Vec3 } from './entity-types';
import { patchLocalToWorld } from './patch-nodes';

const POINT_KEYS = ['pos', 'handleNext', 'handlePrev', 'handleCrossIn', 'handleCrossOut'] as const;
const RECENTER_EPSILON = 1e-7;

function mapPointVectors(point: PatchPoint, map: (v: Vec3) => Vec3): PatchPoint {
  const next = { ...point };
  for (const key of POINT_KEYS) {next[key] = map(point[key]);}
  return next;
}

/**
 * Local offset from the pivot to the center of the anchors' bounding box. Mirrored axes
 * stay 0: the mirror planes run through the pivot, so moving it there would move the copies.
 */
export function patchCenterOffset(params: PatchParams): Vec3 | null {
  if (params.points.length === 0) {return null;}
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const { pos } of params.points) {
    min.x = Math.min(min.x, pos.x); max.x = Math.max(max.x, pos.x);
    min.y = Math.min(min.y, pos.y); max.y = Math.max(max.y, pos.y);
    min.z = Math.min(min.z, pos.z); max.z = Math.max(max.z, pos.z);
  }
  const mirror = params.mirror;
  const offset = {
    x: mirror?.x ? 0 : (min.x + max.x) / 2,
    y: mirror?.y ? 0 : (min.y + max.y) / 2,
    z: mirror?.z ? 0 : (min.z + max.z) / 2,
  };
  const size = Math.abs(offset.x) + Math.abs(offset.y) + Math.abs(offset.z);
  return size > RECENTER_EPSILON ? offset : null;
}

/**
 * Moves the pivot to the patch center without moving the patch in the scene: the
 * position shifts by the rotated offset, every point and handle shifts back by it.
 * Rotation is kept. Returns null when the pivot already sits at the center.
 */
export function recenterPatch(
  params: PatchParams,
  transform: EntityTransform,
): { params: PatchParams; position: Vec3 } | null {
  const offset = patchCenterOffset(params);
  if (!offset) {return null;}
  const position = patchLocalToWorld(offset, transform);
  const points = params.points.map((point) =>
    mapPointVectors(point, (v) => ({ x: v.x - offset.x, y: v.y - offset.y, z: v.z - offset.z })));
  return { params: { ...params, points }, position };
}

/** Uniform scale around the pivot, baked into all points and handles. */
export function scalePatchPoints(params: PatchParams, factor: number): PatchPoint[] {
  return params.points.map((point) =>
    mapPointVectors(point, (v) => ({ x: v.x * factor, y: v.y * factor, z: v.z * factor })));
}
