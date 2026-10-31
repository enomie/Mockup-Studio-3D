import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh } from 'three/webgpu';
import { SELECTION_MASK_LAYER } from '@/constants';
import type { EntityRegistry } from './entity-registry';
import type { LightingSystem } from './lighting/lighting-system';
import { SelectionHighlight } from './selection-highlight';

function createFixture() {
  const root = new Group();
  const meshA = new Mesh(new BoxGeometry());
  const meshB = new Mesh(new BoxGeometry());
  root.add(meshA);
  meshA.add(meshB);

  let selectionListener: (id: string | null) => void = () => {};
  let selectedId: string | null = null;
  const registry = {
    subscribeSelection: (fn: (id: string | null) => void) => { selectionListener = fn; },
    subscribeEntities: () => {},
    getSelectedEntityId: () => selectedId,
    getRuntime: (id: string) => (id === 'a' ? { object: root } : undefined),
  } as unknown as EntityRegistry;
  const lighting = {
    subscribeSelection: () => {},
    getSelectedLightId: () => null,
    isLightHandlesVisible: () => false,
    isLightEnabled: () => false,
  } as unknown as LightingSystem;

  const highlight = new SelectionHighlight(registry, lighting);
  const select = (id: string | null) => {
    selectedId = id;
    selectionListener(id);
  };
  return { highlight, select, meshA, meshB };
}

describe('SelectionHighlight', () => {
  it('marks all meshes of the selected asset on the mask layer', () => {
    const { highlight, select, meshA, meshB } = createFixture();
    select('a');
    expect(highlight.hasAssetSelection()).toBe(true);
    expect(meshA.layers.isEnabled(SELECTION_MASK_LAYER)).toBe(true);
    expect(meshB.layers.isEnabled(SELECTION_MASK_LAYER)).toBe(true);
    expect(meshA.layers.isEnabled(0)).toBe(true);
  });

  it('clears the mask layer when the selection is removed', () => {
    const { highlight, select, meshA, meshB } = createFixture();
    select('a');
    select(null);
    expect(highlight.hasAssetSelection()).toBe(false);
    expect(meshA.layers.isEnabled(SELECTION_MASK_LAYER)).toBe(false);
    expect(meshB.layers.isEnabled(SELECTION_MASK_LAYER)).toBe(false);
  });

  it('does not add any objects to the scene graph', () => {
    const { select, meshA } = createFixture();
    const childCount = meshA.children.length;
    select('a');
    expect(meshA.children.length).toBe(childCount);
  });
});
