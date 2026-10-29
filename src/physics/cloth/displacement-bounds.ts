import {
  CONTACT_BOUND_ALPHA,
  CONTACT_BOUND_BETA,
  CONTACT_D_HAT,
} from '@/physics/cloth/contact-config';
import {
  sceneObstacleClearance,
  type SceneColliderSnapshot,
} from '@/physics/cloth/scene-colliders';

export function computeVertexDisplacementBound(
  xPrev: number,
  yPrev: number,
  zPrev: number,
  speed: number,
  dt: number,
  snapshot: SceneColliderSnapshot,
  dHat: number = CONTACT_D_HAT,
): number {
  const clearance = sceneObstacleClearance(xPrev, yPrev, zPrev, snapshot, dHat);
  const scaled = CONTACT_BOUND_ALPHA * Math.max(clearance, 0);
  const inertial = CONTACT_BOUND_BETA * speed * dt;
  return Math.max(scaled + inertial, 1e-7);
}

/** Clamp position so displacement from x_prev stays within bound (OGC-lite). */
export function clampDisplacementFromPrev(
  pos: Float32Array,
  vertexIndex: number,
  xPrev: Float32Array,
  bound: number,
): void {
  const idx = vertexIndex * 3;
  const px = pos[idx] ?? 0;
  const py = pos[idx + 1] ?? 0;
  const pz = pos[idx + 2] ?? 0;
  const ox = xPrev[idx] ?? 0;
  const oy = xPrev[idx + 1] ?? 0;
  const oz = xPrev[idx + 2] ?? 0;
  const dx = px - ox;
  const dy = py - oy;
  const dz = pz - oz;
  const distSq = dx * dx + dy * dy + dz * dz;
  const maxSq = bound * bound;
  if (distSq <= maxSq || distSq < 1e-20) {
    return;
  }
  const scale = bound / Math.sqrt(distSq);
  pos[idx] = ox + dx * scale;
  pos[idx + 1] = oy + dy * scale;
  pos[idx + 2] = oz + dz * scale;
}
