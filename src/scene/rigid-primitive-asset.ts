import type { AssetKind } from './asset-kind';

export type RigidPrimitiveAssetKind = 'block' | 'cylinder' | 'sphere' | 'wheel-car';

const RIGID_PRIMITIVE_KINDS: ReadonlySet<RigidPrimitiveAssetKind> = new Set([
  'block',
  'cylinder',
  'sphere',
  'wheel-car',
]);

/**
 * Rigid primitives whose gizmo scale is baked into kind params (block, cylinder, sphere).
 * `wheel-car` is a rigid body too but scales via `sizeScale` like the other lathe assets.
 */
export function bakesUniformScaleIntoParams(kind: AssetKind): boolean {
  return isRigidPrimitiveAssetKind(kind) && kind !== 'wheel-car';
}

export function isRigidPrimitiveAssetKind(
  kind: AssetKind,
): kind is RigidPrimitiveAssetKind {
  return RIGID_PRIMITIVE_KINDS.has(kind as RigidPrimitiveAssetKind);
}
