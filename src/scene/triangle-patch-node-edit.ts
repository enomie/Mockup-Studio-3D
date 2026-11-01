import { Euler, Quaternion, Vector3 } from 'three';
import type { PatchPoint } from './asset-triangle-patch';

const HANDLE_KEYS = [
  'handleNext',
  'handlePrev',
  'handleCrossIn',
  'handleCrossOut',
] as const;

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
