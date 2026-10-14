import { describe, expect, it } from 'vitest';
import { defaultSphereParams } from '@/scene/asset-sphere';
import { PHYSICS_COLLIDER_MARGIN_M } from './constants';
import { sphereColliderShapeFromParams, sphereVolumeM3 } from './sphere-collider-shape';

describe('sphereColliderShapeFromParams', () => {
  it('inflates ball radius by margin', () => {
    const params = defaultSphereParams();
    const shape = sphereColliderShapeFromParams(params);
    expect(shape.colliderRadiusM).toBeCloseTo(params.radiusM + PHYSICS_COLLIDER_MARGIN_M);
    expect(shape.centerOffsetY).toBeCloseTo(params.radiusM);
  });

  it('volume uses mesh radius only', () => {
    const params = { radiusM: 0.2 };
    const expected = (4 / 3) * Math.PI * 0.2 ** 3;
    expect(sphereVolumeM3(params)).toBeCloseTo(expected);
  });
});
