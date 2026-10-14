import type { Vec3 } from '@/scene/entity-types';

export type HorizontalDirectionResult =
  | { ok: true; x: number; z: number }
  | { ok: false };

/** Unit direction on XZ from anchor toward target; Y is ignored. */
export function horizontalDirectionFromTo(
  anchor: Vec3,
  target: Vec3,
): HorizontalDirectionResult {
  const dx = target.x - anchor.x;
  const dz = target.z - anchor.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) {
    return { ok: false };
  }
  return { ok: true, x: dx / len, z: dz / len };
}
