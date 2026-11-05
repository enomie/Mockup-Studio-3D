import { Group, Mesh } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { isVisibleInHierarchy } from './selection-controller';

describe('isVisibleInHierarchy', () => {
  it('is true for a visible chain', () => {
    const root = new Group();
    const mesh = new Mesh();
    root.add(mesh);
    expect(isVisibleInHierarchy(mesh)).toBe(true);
  });

  it('is false when an ancestor is hidden', () => {
    const root = new Group();
    const mesh = new Mesh();
    root.add(mesh);
    root.visible = false;
    expect(isVisibleInHierarchy(mesh)).toBe(false);
  });
});
