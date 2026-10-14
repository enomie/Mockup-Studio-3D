import { describe, expect, it } from 'vitest';
import { defaultBlockParams } from './asset-block';
import { defaultCylinderParams } from './asset-cylinder';
import { defaultSphereParams } from './asset-sphere';
import { defaultWheelCarParams } from './asset-wheel-car';
import type { AssetEntity } from './entity-types';
import { buildRigidPrimitiveUniformScalePartial } from './rigid-primitive-uniform-scale';
import { mergeKindParamPatch } from './asset-kind-registry';

function minimalEntity(assetKind: AssetEntity['assetKind']): AssetEntity {
  return {
    id: 'e1',
    type: 'asset',
    name: 'Test',
    assetKind,
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  };
}

describe('buildRigidPrimitiveUniformScalePartial', () => {
  it('doubles block dimensions including corner radius', () => {
    const entity = {
      ...minimalEntity('block'),
      blockParams: defaultBlockParams(),
    };
    const partial = buildRigidPrimitiveUniformScalePartial(entity, 2);
    expect(partial).toEqual({
      widthM: 0.6,
      heightM: 0.6,
      depthM: 0.6,
      cornerRadiusMm: 10,
    });
    const merged = mergeKindParamPatch('block', entity, partial);
    expect(merged.blockParams?.widthM).toBe(0.6);
  });

  it('scales cylinder params uniformly', () => {
    const entity = {
      ...minimalEntity('cylinder'),
      cylinderParams: defaultCylinderParams(),
    };
    const partial = buildRigidPrimitiveUniformScalePartial(entity, 2);
    expect(partial).toMatchObject({
      radiusM: 0.3,
      heightM: 0.6,
      cornerRadiusMm: 10,
    });
  });

  it('scales sphere radius', () => {
    const entity = {
      ...minimalEntity('sphere'),
      sphereParams: defaultSphereParams(),
    };
    const partial = buildRigidPrimitiveUniformScalePartial(entity, 2);
    expect(partial).toEqual({ radiusM: 0.3 });
  });

  it('scales wheel-car linear params', () => {
    const entity = {
      ...minimalEntity('wheel-car'),
      wheelCarParams: defaultWheelCarParams(),
    };
    const base = defaultWheelCarParams();
    const partial = buildRigidPrimitiveUniformScalePartial(entity, 2);
    expect(partial).toMatchObject({
      outerRadiusM: base.outerRadiusM * 2,
      tireWidthM: base.tireWidthM * 2,
      tireCornerRadiusMm: base.tireCornerRadiusMm * 2,
    });
  });

  it('returns null for factor 1', () => {
    const entity = {
      ...minimalEntity('block'),
      blockParams: defaultBlockParams(),
    };
    expect(buildRigidPrimitiveUniformScalePartial(entity, 1)).toBeNull();
  });

  it('returns null for non-rigid kinds', () => {
    const entity = minimalEntity('print');
    expect(buildRigidPrimitiveUniformScalePartial(entity, 2)).toBeNull();
  });
});
