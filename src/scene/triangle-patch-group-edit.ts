import { Matrix4, type Quaternion, Vector3 } from 'three/webgpu';
import { clonePatchPoint, type PatchPoint } from './asset-triangle-patch';
import type { Vec3 } from './entity-types';

const POINT_KEYS = ['pos', 'handleNext', 'handlePrev', 'handleCrossIn', 'handleCrossOut'] as const;

/** Mean of the anchors of the given points (patch-local); null when none of the ids exist. */
export function patchPointsCenter(points: readonly PatchPoint[], ids: readonly string[]): Vec3 | null {
  const selected = points.filter((point) => ids.includes(point.id));
  if (selected.length === 0) {return null;}
  const sum = selected.reduce(
    (acc, point) => ({ x: acc.x + point.pos.x, y: acc.y + point.pos.y, z: acc.z + point.pos.z }),
    { x: 0, y: 0, z: 0 },
  );
  return { x: sum.x / selected.length, y: sum.y / selected.length, z: sum.z / selected.length };
}

/** Affine transform about `center`: rotate by `quaternion`, then scale uniformly by `scale`. */
export function groupTransformMatrix(center: Vec3, quaternion: Quaternion, scale: number): Matrix4 {
  const toOrigin = new Matrix4().makeTranslation(-center.x, -center.y, -center.z);
  const rotateScale = new Matrix4().compose(new Vector3(), quaternion, new Vector3(scale, scale, scale));
  const back = new Matrix4().makeTranslation(center.x, center.y, center.z);
  return back.multiply(rotateScale).multiply(toOrigin);
}

/**
 * Applies `matrix` to the anchor and all handles of the given points; other points stay.
 * Handles keep their place relative to the anchor, so they move, turn and scale with it.
 */
export function transformPatchPoints(
  points: readonly PatchPoint[],
  ids: readonly string[],
  matrix: Matrix4,
): PatchPoint[] {
  const v = new Vector3();
  return points.map((point) => {
    if (!ids.includes(point.id)) {return point;}
    const next = clonePatchPoint(point);
    for (const key of POINT_KEYS) {
      v.set(point[key].x, point[key].y, point[key].z).applyMatrix4(matrix);
      next[key] = { x: v.x, y: v.y, z: v.z };
    }
    return next;
  });
}

/** Moves the anchors and handles of the given points by `delta`. */
export function translatePatchPoints(
  points: readonly PatchPoint[],
  ids: readonly string[],
  delta: Vec3,
): PatchPoint[] {
  return transformPatchPoints(points, ids, new Matrix4().makeTranslation(delta.x, delta.y, delta.z));
}

/** Adds the point to the selection, or removes it (the last point always stays selected). */
export function togglePointId(ids: readonly string[], pointId: string): string[] {
  if (!ids.includes(pointId)) {return [...ids, pointId];}
  return ids.length > 1 ? ids.filter((id) => id !== pointId) : [...ids];
}
