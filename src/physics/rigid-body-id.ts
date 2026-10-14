import type { RigidPrimitiveAssetKind } from '@/scene/rigid-primitive-asset';

export function rigidPhysicsBodyId(
  kind: RigidPrimitiveAssetKind,
  entityId: string,
): string {
  return `physics:${kind}:${entityId}`;
}
