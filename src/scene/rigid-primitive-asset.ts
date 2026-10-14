import type { AssetKind } from './asset-kind';

export type RigidPrimitiveAssetKind = 'block' | 'cylinder' | 'sphere' | 'wheel-car';

const RIGID_PRIMITIVE_KINDS: ReadonlySet<RigidPrimitiveAssetKind> = new Set([
  'block',
  'cylinder',
  'sphere',
  'wheel-car',
]);

export function isRigidPrimitiveAssetKind(
  kind: AssetKind,
): kind is RigidPrimitiveAssetKind {
  return RIGID_PRIMITIVE_KINDS.has(kind as RigidPrimitiveAssetKind);
}
