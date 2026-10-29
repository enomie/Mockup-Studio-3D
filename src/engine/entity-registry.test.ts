import { Group } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { defaultTransform } from '@/scene/entity-types';
import { EntityRegistry } from './entity-registry';

describe('EntityRegistry.setKindParams', () => {
  it('patches params when the kind belongs to the family', () => {
    const registry = new EntityRegistry();
    registry.addEntity('block-1', 'block', new Group(), defaultTransform());

    registry.setKindParams('block', 'block-1', { widthM: 0.42 });

    expect(registry.getRuntime('block-1')?.entity.blockParams?.widthM).toBe(0.42);
  });

  it('ignores patches for a family the kind does not belong to', () => {
    const registry = new EntityRegistry();
    registry.addEntity('sphere-1', 'sphere', new Group(), defaultTransform());
    const before = structuredClone(registry.getRuntime('sphere-1')?.entity);

    registry.setKindParams('block', 'sphere-1', { widthM: 0.42 });

    expect(registry.getRuntime('sphere-1')?.entity).toEqual(before);
  });
});
