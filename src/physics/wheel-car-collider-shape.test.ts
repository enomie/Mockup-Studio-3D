import { describe, expect, it } from 'vitest';
import { defaultWheelCarParams } from '@/scene/asset-wheel-car';
import { PHYSICS_COLLIDER_MARGIN_M } from './constants';
import { wheelCarColliderShapeFromParams } from './wheel-car-collider-shape';

describe('wheelCarColliderShapeFromParams', () => {
  it('uses outer radius and tire width with margin', () => {
    const params = defaultWheelCarParams();
    const shape = wheelCarColliderShapeFromParams(params);
    expect(shape.radiusM).toBeCloseTo(params.outerRadiusM + PHYSICS_COLLIDER_MARGIN_M, 6);
    expect(shape.halfHeightM).toBeCloseTo(
      params.tireWidthM * 0.5 + PHYSICS_COLLIDER_MARGIN_M,
      6,
    );
    expect(shape.centerOffsetY).toBe(params.outerRadiusM);
  });
});
