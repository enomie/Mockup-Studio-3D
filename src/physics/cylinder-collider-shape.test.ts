import { describe, expect, it } from 'vitest';
import { defaultCylinderParams } from '@/scene/asset-cylinder';
import { PHYSICS_COLLIDER_MARGIN_M } from './constants';
import { cylinderColliderShapeFromParams, cylinderVolumeM3 } from './cylinder-collider-shape';

describe('cylinderColliderShapeFromParams', () => {
  it('inflates sharp cylinder by margin', () => {
    const params = { ...defaultCylinderParams(), cornerRadiusMm: 0 };
    const shape = cylinderColliderShapeFromParams(params);
    expect(shape.halfHeightM).toBeCloseTo(params.heightM * 0.5 + PHYSICS_COLLIDER_MARGIN_M);
    expect(shape.radiusM).toBeCloseTo(params.radiusM + PHYSICS_COLLIDER_MARGIN_M);
    expect(shape.borderRadiusM).toBe(0);
    expect(shape.centerOffsetY).toBeCloseTo(params.heightM * 0.5);
  });

  it('uses round cylinder inner extents when fillet is set', () => {
    const params = defaultCylinderParams();
    const borderM = params.cornerRadiusMm / 1000;
    const shape = cylinderColliderShapeFromParams(params);
    expect(shape.borderRadiusM).toBeCloseTo(borderM, 4);
    expect(shape.radiusM).toBeCloseTo(params.radiusM + PHYSICS_COLLIDER_MARGIN_M - borderM, 4);
  });

  it('volume ignores margin', () => {
    const params = defaultCylinderParams();
    const expected = Math.PI * params.radiusM ** 2 * params.heightM;
    expect(cylinderVolumeM3(params)).toBeCloseTo(expected);
  });
});
