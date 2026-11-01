import { describe, expect, it } from 'vitest';
import { Group, Matrix4, Mesh, Vector3 } from 'three/webgpu';
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
      copy.updateMatrixWorld();
      expect(copy.matrixWorld.equals(new Matrix4())).toBe(false);
    }
  });

  it('mirrors across the scene planes, not the asset pivot', () => {
    const scene = new Group();
    const group = new Group();
    group.position.set(2, 0.5, 1);
    group.rotation.y = 0.7;
    scene.add(group);
    addTrianglePatch(group, undefined, {}, {
      ...defaultTrianglePatchParams(),
      mirror: { x: true, y: false, z: false },
    });
    scene.updateMatrixWorld(true);
    const copy = group.children.find((child) => child.userData.assetMeshRole === 'trianglePatchMirror');
    expect(copy).toBeDefined();
    const local = new Vector3(0.3, 0.2, -0.4);
    const original = local.clone().applyMatrix4(group.matrixWorld);
    const mirrored = local.clone().applyMatrix4(copy!.matrixWorld);
    expect(mirrored.x).toBeCloseTo(-original.x);
    expect(mirrored.y).toBeCloseTo(original.y);
    expect(mirrored.z).toBeCloseTo(original.z);

    // Follows the asset when it moves, without a rebuild.
    group.position.x = 5;
    scene.updateMatrixWorld(true);
    const moved = local.clone().applyMatrix4(group.matrixWorld);
    expect(local.clone().applyMatrix4(copy!.matrixWorld).x).toBeCloseTo(-moved.x);
  });
});
