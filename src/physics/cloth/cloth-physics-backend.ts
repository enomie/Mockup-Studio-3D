import type { VerletParams, VerletState } from '@/physics/cloth/types';
import { simulateVerletStep } from '@/physics/cloth/verlet';

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
  simulateVerletStep(state, params);
}
