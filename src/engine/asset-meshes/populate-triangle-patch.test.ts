import { describe, expect, it } from 'vitest';
import { Group, Mesh } from 'three/webgpu';
import { defaultTrianglePatchParams } from '@/scene/asset-triangle-patch';
import { addTrianglePatch } from './populate-triangle-patch';

describe('addTrianglePatch mirror', () => {
  it('adds shared-geometry mirror copies with negative scale', () => {
    const group = new Group();
    const params = { ...defaultTrianglePatchParams(), mirror: { x: true, y: true, z: false } };
    const original = addTrianglePatch(group, undefined, {}, params);
    const meshes = group.children.filter((child): child is Mesh => child instanceof Mesh);
    expect(meshes).toHaveLength(4);
    const copies = meshes.filter((mesh) => mesh.userData.assetMeshRole === 'trianglePatchMirror');
    expect(copies).toHaveLength(3);
    for (const copy of copies) {
      expect(copy.geometry).toBe(original.geometry);
      expect(Math.min(copy.scale.x, copy.scale.y, copy.scale.z)).toBe(-1);
    }
  });
});
