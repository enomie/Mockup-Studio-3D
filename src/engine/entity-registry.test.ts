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

describe('EntityRegistry multi-selection', () => {
  function setup() {
    const registry = new EntityRegistry();
    for (const id of ['a', 'b', 'c']) {registry.addEntity(id, 'block', new Group(), defaultTransform());}
    return registry;
  }

  it('collects entities with toggle and makes the last one active', () => {
    const registry = setup();
    registry.setSelectedEntityId('a');
    registry.toggleSelectedEntityId('b');
    registry.toggleSelectedEntityId('c');
    expect(registry.getSelectedEntityId()).toBe('c');
    expect(registry.getSelectedEntityIds()).toEqual(['c', 'a', 'b']);
    registry.toggleSelectedEntityId('c');
    expect(registry.getSelectedEntityIds()).toEqual(['b', 'a']);
    registry.toggleSelectedEntityId('a');
    expect(registry.getSelectedEntityIds()).toEqual(['b']);
  });

  it('a plain select and removal shrink the selection', () => {
    const registry = setup();
    registry.setSelectedEntityId('a');
    registry.toggleSelectedEntityId('b');
    registry.removeEntity('b');
    expect(registry.getSelectedEntityIds()).toEqual(['a']);
    registry.toggleSelectedEntityId('c');
    registry.setSelectedEntityId('c');
    expect(registry.getSelectedEntityIds()).toEqual(['c']);
  });
});

describe('EntityRegistry.setSelectedEntityIds', () => {
  it('selects all given entities with the last one active', () => {
    const registry = new EntityRegistry();
    for (const id of ['a', 'b']) {registry.addEntity(id, 'block', new Group(), defaultTransform());}
    registry.setSelectedEntityIds(['a', 'b', 'missing']);
    expect(registry.getSelectedEntityIds()).toEqual(['b', 'a']);
  });
});
