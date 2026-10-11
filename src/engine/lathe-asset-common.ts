import type { BufferGeometry } from 'three/webgpu';

/** Default LatheGeometry seam is +Z; offset so the join sits at −Z (back), front stays clean. */
export const LATHE_SEAM_PHI_START = Math.PI;

export const FULL_LATHE_PHI_LENGTH = Math.PI * 2;

/** Shift geometry so its bounding-box minimum Y sits at y = 0 (entity foot). */
export function applyLatheGeometryFootToY0(geometry: BufferGeometry): void {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) {
    return;
  }
  const minY = box.min.y;
  if (Math.abs(minY) > 1e-9) {
    geometry.translate(0, -minY, 0);
  }
}
