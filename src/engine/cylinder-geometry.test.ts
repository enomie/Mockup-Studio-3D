import { describe, expect, it } from 'vitest';
import { defaultCylinderParams } from '@/scene/asset-cylinder';
import { buildCylinderGeometry } from './cylinder-geometry';

describe('cylinder-geometry', () => {
  it.each([0, 5])('places the foot at y = 0 (corner %i mm)', (cornerRadiusMm) => {
    const params = { ...defaultCylinderParams(), cornerRadiusMm };
    const geometry = buildCylinderGeometry(params);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 6);
    expect(geometry.boundingBox!.max.y).toBeCloseTo(params.heightM, 6);
  });
});
