import { BufferAttribute, BufferGeometry } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import {
  applyLatheGeometryFootToY0,
  FULL_LATHE_PHI_LENGTH,
  LATHE_SEAM_PHI_START,
} from './lathe-asset-common';

describe('lathe-asset-common', () => {
  it('exposes seam phi start at π and full revolution length', () => {
    expect(LATHE_SEAM_PHI_START).toBe(Math.PI);
    expect(FULL_LATHE_PHI_LENGTH).toBe(Math.PI * 2);
  });

  it('applyLatheGeometryFootToY0 shifts min Y to 0', () => {
    const geometry = new BufferGeometry();
    const positions = new Float32Array([0, 2, 0, 0, 5, 0, 0, 3, 0]);
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    applyLatheGeometryFootToY0(geometry);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 9);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(3, 9);
  });
});
