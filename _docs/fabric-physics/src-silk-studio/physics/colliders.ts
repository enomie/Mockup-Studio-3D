/**
 * v0.0.1: Pedestal and floor collisions are handled analytically in verlet.ts.
 * Future: optional Rapier SIMD rigid colliders for props / complex geometry.
 */
export interface ColliderHook {
  readonly label: string;
}

export const ANALYTIC_COLLIDERS: ColliderHook = {
  label: 'analytic-pedestal-floor',
};
