import { Euler, Quaternion, Vector3 } from 'three';
import type { PatchPoint } from './asset-triangle-patch';

const HANDLE_KEYS = [
  'handleNext',
  'handlePrev',
  'handleCrossIn',
  'handleCrossOut',
] as const;

export type PatchHandleKey = (typeof HANDLE_KEYS)[number];

/** Rotate all tangent handles around `node.pos` (anchor stays fixed). */
export function rotatePatchNodeHandlesAroundAnchor(
  node: PatchPoint,
  deltaEulerRad: { x: number; y: number; z: number },
): PatchPoint {
  const euler = new Euler(deltaEulerRad.x, deltaEulerRad.y, deltaEulerRad.z, 'XYZ');
  const quaternion = new Quaternion().setFromEuler(euler);
  const anchor = new Vector3(node.pos.x, node.pos.y, node.pos.z);

  const next: PatchPoint = {
    ...node,
    pos: { ...node.pos },
    handleNext: { ...node.handleNext },
    handlePrev: { ...node.handlePrev },
    handleCrossIn: { ...node.handleCrossIn },
    handleCrossOut: { ...node.handleCrossOut },
  };

  for (const key of HANDLE_KEYS) {
    const rel = new Vector3(node[key].x, node[key].y, node[key].z)
      .sub(anchor)
      .applyQuaternion(quaternion);
    next[key] = {
      x: anchor.x + rel.x,
      y: anchor.y + rel.y,
      z: anchor.z + rel.z,
    };
  }

  return next;
}

export function translatePatchNodeAnchor(
  node: PatchPoint,
  newPos: { x: number; y: number; z: number },
): PatchPoint {
  const delta = {
    x: newPos.x - node.pos.x,
    y: newPos.y - node.pos.y,
    z: newPos.z - node.pos.z,
  };

  const next: PatchPoint = {
    ...node,
    pos: { ...newPos },
    handleNext: {
      x: node.handleNext.x + delta.x,
      y: node.handleNext.y + delta.y,
      z: node.handleNext.z + delta.z,
    },
    handlePrev: {
      x: node.handlePrev.x + delta.x,
      y: node.handlePrev.y + delta.y,
      z: node.handlePrev.z + delta.z,
    },
    handleCrossIn: {
      x: node.handleCrossIn.x + delta.x,
      y: node.handleCrossIn.y + delta.y,
      z: node.handleCrossIn.z + delta.z,
    },
    handleCrossOut: {
      x: node.handleCrossOut.x + delta.x,
      y: node.handleCrossOut.y + delta.y,
      z: node.handleCrossOut.z + delta.z,
    },
  };

  return next;
}

/** Pink handles closer than this to one line count as smooth when no state is stored. */
const SMOOTH_TOLERANCE_DEG = 1;

/**
 * Edge switch of a point: the stored value, or for points from before the switch existed:
 * smooth when both pink handles already lie (almost) on one line, corner otherwise.
 */
export function resolveEdgeTangent(point: PatchPoint): 'smooth' | 'corner' {
  if (point.edgeTangent) {return point.edgeTangent;}
  const n = sub(point.handleNext, point.pos);
  const p = sub(point.handlePrev, point.pos);
  const ln = Math.hypot(n.x, n.y, n.z);
  const lp = Math.hypot(p.x, p.y, p.z);
  if (ln < 1e-9 || lp < 1e-9) {return 'corner';}
  const cos = (n.x * p.x + n.y * p.y + n.z * p.z) / (ln * lp);
  // Opposite directions: angle between them close to 180 degrees.
  const angleFromOpposite = (Math.acos(Math.max(-1, Math.min(1, -cos))) * 180) / Math.PI;
  return angleFromOpposite < SMOOTH_TOLERANCE_DEG ? 'smooth' : 'corner';
}

function sub(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/**
 * Edge switch rule after `movedKey` changed: with a smooth edge the other pink handle
 * turns to the opposite direction and keeps its length. Other handles: unchanged.
 */
export function applyEdgeTangentRule(point: PatchPoint, movedKey: string): PatchPoint {
  if (movedKey !== 'handleNext' && movedKey !== 'handlePrev') {return point;}
  if (resolveEdgeTangent(point) !== 'smooth') {return point;}
  const otherKey = movedKey === 'handleNext' ? 'handlePrev' : 'handleNext';
  const moved = sub(point[movedKey], point.pos);
  const other = sub(point[otherKey], point.pos);
  const movedLen = Math.hypot(moved.x, moved.y, moved.z);
  if (movedLen < 1e-9) {return point;} // retracted handle: no direction to follow
  const otherLen = Math.hypot(other.x, other.y, other.z);
  const k = -otherLen / movedLen;
  return {
    ...point,
    edgeTangent: 'smooth',
    [otherKey]: { x: point.pos.x + moved.x * k, y: point.pos.y + moved.y * k, z: point.pos.z + moved.z * k },
  };
}
