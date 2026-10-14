import { describe, expect, it } from 'vitest';
import { defaultBlockParams } from './asset-block';
import {
  blockMassKgFromEntity,
  clampPhysicsDensityKgPerM3,
  DEFAULT_PHYSICS_DENSITY_KG_PER_M3,
  normalizePhysicsBodyMode,
  resolvePhysicsBodyMode,
  rigidMassKgFromVolumeM3,
} from './physics-rigid-body';
import type { AssetEntity } from './entity-types';

function blockEntity(partial: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: 'b1',
    type: 'asset',
    name: 'Block',
    assetKind: 'block',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    blockParams: defaultBlockParams(),
    ...partial,
  };
}

describe('physics-rigid-body', () => {
  it('defaults mode to dynamic and density to 1000', () => {
    expect(resolvePhysicsBodyMode(blockEntity())).toBe('dynamic');
    expect(blockMassKgFromEntity(blockEntity())).toBeCloseTo(
      0.3 * 0.3 * 0.3 * DEFAULT_PHYSICS_DENSITY_KG_PER_M3,
    );
  });

  it('clamps density', () => {
    expect(clampPhysicsDensityKgPerM3(10)).toBe(50);
    expect(clampPhysicsDensityKgPerM3(99_999)).toBe(15_000);
  });

  it('respects fixed mode', () => {
    expect(resolvePhysicsBodyMode(blockEntity({ physicsBodyMode: 'fixed' }))).toBe(
      'fixed',
    );
  });

  it('computes rigid mass from volume and density', () => {
    expect(rigidMassKgFromVolumeM3(0.027, 1000)).toBeCloseTo(27);
  });

  it('normalizes physics body mode', () => {
    expect(normalizePhysicsBodyMode('fixed')).toBe('fixed');
    expect(normalizePhysicsBodyMode('dynamic')).toBe('dynamic');
    expect(normalizePhysicsBodyMode('invalid')).toBe('dynamic');
  });
});
