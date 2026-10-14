import { describe, expect, it } from 'vitest';
import { defaultBlockParams } from '@/scene/asset-block';
import { PHYSICS_COLLIDER_MARGIN_M } from './constants';
import { blockColliderShapeFromParams, blockVolumeM3 } from './block-collider-shape';

describe('blockColliderShapeFromParams', () => {
  it('uses Rapier inner half extents when fillet is active (border radius not double-counted)', () => {
    const params = defaultBlockParams();
    const shape = blockColliderShapeFromParams(params);
    const meshHalf = params.heightM * 0.5;
    const m = PHYSICS_COLLIDER_MARGIN_M;
    const r = shape.borderRadiusM;
    expect(shape.halfExtents).toEqual({
      x: meshHalf + m - r,
      y: meshHalf + m - r,
      z: meshHalf + m - r,
    });
    expect(shape.halfExtents.y + r).toBeCloseTo(meshHalf + m);
    expect(shape.centerOffsetY).toBe(meshHalf);
    expect(shape.borderRadiusM).toBeCloseTo(0.005);
  });

  it('computes box volume for mass', () => {
    const params = defaultBlockParams();
    expect(blockVolumeM3(params)).toBe(params.widthM * params.heightM * params.depthM);
  });

  it('inflates cuboid half extents when corners are sharp', () => {
    const params = { ...defaultBlockParams(), cornerRadiusMm: 0 };
    const shape = blockColliderShapeFromParams(params);
    const m = PHYSICS_COLLIDER_MARGIN_M;
    expect(shape.borderRadiusM).toBe(0);
    expect(shape.halfExtents.y).toBe(params.heightM * 0.5 + m);
  });
});
