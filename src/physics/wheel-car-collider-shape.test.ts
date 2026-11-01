import { describe, expect, it } from 'vitest';
import { wheelCarDimensionsM } from '@/scene/asset-wheel-car';
import { PHYSICS_COLLIDER_MARGIN_M } from './constants';
import { wheelCarColliderShapeFromSizeScale } from './wheel-car-collider-shape';

describe('wheelCarColliderShapeFromSizeScale', () => {
  it('uses SVG outer radius and tire width × sizeScale, with margin', () => {
    for (const sizeScale of [1, 1.5]) {
      const dims = wheelCarDimensionsM(sizeScale);
      const shape = wheelCarColliderShapeFromSizeScale(sizeScale);
      expect(shape.radiusM).toBeCloseTo(dims.outerRadiusM + PHYSICS_COLLIDER_MARGIN_M, 6);
      expect(shape.halfHeightM).toBeCloseTo(dims.tireWidthM * 0.5 + PHYSICS_COLLIDER_MARGIN_M, 6);
      expect(shape.centerOffsetY).toBe(dims.outerRadiusM);
    }
    expect(wheelCarDimensionsM(1).outerRadiusM).toBeCloseTo(0.3305, 6);
    expect(wheelCarDimensionsM(1).tireWidthM).toBeCloseTo(0.255, 6);
  });
});
