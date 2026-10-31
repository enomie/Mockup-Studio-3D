import { Euler, Quaternion, Vector3 } from 'three';
import type { PatchPoint } from './asset-triangle-patch';
import type { EntityTransform, Vec3 } from './entity-types';

const HANDLE_KEYS = ['handleNext', 'handlePrev', 'handleCrossIn', 'handleCrossOut'] as const;
type HandleKey = (typeof HANDLE_KEYS)[number];

/** Which parts of a copied point a paste applies. */
export type PatchPointPasteMode = 'all' | 'position' | 'handles';

/**
 * A copied patch point in world space: anchor position plus handle offsets from the
 * anchor. Offsets keep handles identical when only the handles are pasted.
 */
export interface PatchPointClipboard {
  sourceEntityId: string;
  sourcePointId: string;
  /** Label for the UI, e.g. "Patch 1 · P3". */
  label: string;
  pos: Vec3;
  handleOffsets: Record<HandleKey, Vec3>;
}

function rotationOf(transform: EntityTransform): Quaternion {
  const { x, y, z } = transform.rotation;
  return new Quaternion().setFromEuler(new Euler(x, y, z, 'XYZ'));
}

function toVec3(v: Vector3): Vec3 {
  return { x: v.x, y: v.y, z: v.z };
}

/** Captures `point` of a patch with `transform` into a world-space clipboard entry. */
export function copyPatchPoint(
  point: PatchPoint,
  transform: EntityTransform,
  source: { entityId: string; label: string },
): PatchPointClipboard {
  const q = rotationOf(transform);
  const anchor = new Vector3(point.pos.x, point.pos.y, point.pos.z);
  const worldPos = anchor.clone().applyQuaternion(q).add(
    new Vector3(transform.position.x, transform.position.y, transform.position.z),
  );
  const offsets = {} as Record<HandleKey, Vec3>;
  for (const key of HANDLE_KEYS) {
    const h = point[key];
    offsets[key] = toVec3(new Vector3(h.x, h.y, h.z).sub(anchor).applyQuaternion(q));
  }
  return {
    sourceEntityId: source.entityId,
    sourcePointId: point.id,
    label: source.label,
    pos: toVec3(worldPos),
    handleOffsets: offsets,
  };
}

/**
 * Applies `clip` to `target` (a point of a patch with `transform`). Returns a new point;
 * id and name of the target are kept. With mode 'position' the handles move along with
 * the anchor; with mode 'handles' the anchor stays put.
 */
export function pastePatchPoint(
  target: PatchPoint,
  transform: EntityTransform,
  clip: PatchPointClipboard,
  mode: PatchPointPasteMode = 'all',
): PatchPoint {
  const qInv = rotationOf(transform).invert();
  const localPos =
    mode === 'handles'
      ? new Vector3(target.pos.x, target.pos.y, target.pos.z)
      : new Vector3(clip.pos.x, clip.pos.y, clip.pos.z)
        .sub(new Vector3(transform.position.x, transform.position.y, transform.position.z))
        .applyQuaternion(qInv);

  const next: PatchPoint = { ...target, pos: toVec3(localPos) };
  // New handles: let the edge switch be derived from them again (smooth if on one line).
  if (mode !== 'position') {delete next.edgeTangent;}
  for (const key of HANDLE_KEYS) {
    let offset: Vector3;
    if (mode === 'position') {
      const h = target[key];
      offset = new Vector3(h.x - target.pos.x, h.y - target.pos.y, h.z - target.pos.z);
    } else {
      const o = clip.handleOffsets[key];
      offset = new Vector3(o.x, o.y, o.z).applyQuaternion(qInv);
    }
    next[key] = toVec3(localPos.clone().add(offset));
  }
  return next;
}
