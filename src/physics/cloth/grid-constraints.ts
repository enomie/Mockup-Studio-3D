import { vec3Get } from '@/physics/cloth/float-buffer';
import type { DistanceConstraint } from '@/physics/cloth/types';

/**
 * Silk-style grid constraints (idx = y * nx + x).
 * Bending includes skip-2 and skip-3 neighbors.
 */
export function buildFabricClothGridConstraints(
  pos: Float32Array,
  segX: number,
  segY: number,
): DistanceConstraint[] {
  const nx = segX + 1;
  const ny = segY + 1;
  const constraints: DistanceConstraint[] = [];

  const addConstraint = (
    i1: number,
    i2: number,
    type: DistanceConstraint['type'] = 'structural',
  ): void => {
    const [x1, y1, z1] = vec3Get(pos, i1);
    const [x2, y2, z2] = vec3Get(pos, i2);
    const dx = x1 - x2;
    const dy = y1 - y2;
    const dz = z1 - z2;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    constraints.push({ i1, i2, restDist: dist, type });
  };

  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const idx = y * nx + x;
      if (x < segX) {addConstraint(idx, idx + 1, 'structural');}
      if (y < segY) {addConstraint(idx, idx + nx, 'structural');}
      if (x < segX && y < segY) {
        addConstraint(idx, idx + nx + 1, 'shear');
        addConstraint(idx + 1, idx + nx, 'shear');
      }
      if (x < segX - 1) {addConstraint(idx, idx + 2, 'bending');}
      if (y < segY - 1) {addConstraint(idx, idx + nx * 2, 'bending');}
      if (x < segX - 2) {addConstraint(idx, idx + 3, 'bending');}
      if (y < segY - 2) {addConstraint(idx, idx + nx * 3, 'bending');}
    }
  }

  return constraints;
}
