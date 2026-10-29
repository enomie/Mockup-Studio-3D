import type { VerletParams, VerletState } from './types.ts';
import { simulateVerletStep } from './verlet.ts';

export type ClothPhysicsBackend = 'cpu' | 'webgpu';

/**
 * Cloth physics entry point. WebGPU compute uses the same CPU Verlet path until a
 * dedicated compute shader is wired (OGC-lite math is per-vertex parallel-ready).
 */
export function stepClothPhysics(
  _backend: ClothPhysicsBackend,
  state: VerletState,
  params: VerletParams,
): void {
  // WebGPU compute can replace this entry point; OGC-lite math is per-vertex parallel-ready.
  simulateVerletStep(state, params);
}
