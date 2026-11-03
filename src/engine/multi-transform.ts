import { Box3, Vector3, type Object3D, type Quaternion } from 'three/webgpu';

/** Pose of a group member when a group gizmo drag started (parent space). */
export interface GroupMemberStart {
  id: string;
  position: Vector3;
  quaternion: Quaternion;
}

export interface GroupMemberPose {
  id: string;
  position: Vector3;
  quaternion: Quaternion;
}

/** Centre of the combined world bounding box of the objects (or null when all are empty). */
export function groupCenter(objects: readonly Object3D[]): Vector3 | null {
  const union = new Box3();
  const box = new Box3();
  for (const object of objects) {
    box.setFromObject(object);
    if (!box.isEmpty()) {union.union(box);}
  }
  return union.isEmpty() ? null : union.getCenter(new Vector3());
}

/**
 * Moves and turns the members like rigid children of the pivot: the pivot went from
 * (`pivotStart`, `pivotStartQuat`) to (`pivot`, `pivotQuat`).
 */
export function applyGroupRigidDelta(
  members: readonly GroupMemberStart[],
  pivotStart: Vector3,
  pivotStartQuat: Quaternion,
  pivot: Vector3,
  pivotQuat: Quaternion,
): GroupMemberPose[] {
  const delta = pivotQuat.clone().multiply(pivotStartQuat.clone().invert());
  return members.map((member) => ({
    id: member.id,
    position: member.position.clone().sub(pivotStart).applyQuaternion(delta).add(pivot),
    quaternion: delta.clone().multiply(member.quaternion),
  }));
}

/** Spreads member positions from the pivot by `factor` (uniform group scale). */
export function applyGroupScale(
  members: readonly GroupMemberStart[],
  pivot: Vector3,
  factor: number,
): GroupMemberPose[] {
  return members.map((member) => ({
    id: member.id,
    position: member.position.clone().sub(pivot).multiplyScalar(factor).add(pivot),
    quaternion: member.quaternion.clone(),
  }));
}
