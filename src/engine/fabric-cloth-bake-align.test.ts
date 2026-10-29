import { Box3, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { defaultFabricClothParams } from '@/scene/asset-fabric-cloth';
import type { AssetEntity } from '@/scene/entity-types';
import { buildFabricClothMeshFromOptions } from './fabric-cloth-geometry';
import {
  bakeFabricClothMeshFromVerletBinding,
  buildBufferGeometryFromBakedMeshPayload,
} from './fabric-cloth-bake';
import { alignFabricClothBakePayloadToSourceMesh } from './fabric-cloth-bake-align';
import {
  createFabricClothVerletBinding,
  flushBindingPlane,
} from './fabric-cloth-verlet-session';
function entityLocalBox(mesh: Mesh): Box3 {
  const box = new Box3();
  const position = mesh.geometry.getAttribute('position');
  const point = new Vector3();
  mesh.updateMatrix();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    point.applyMatrix4(mesh.matrix);
    box.expandByPoint(point);
  }
  return box;
}

describe('alignFabricClothBakePayloadToSourceMesh', () => {
  it('matches source shell bounds after bake at rest', () => {
    const entity: AssetEntity = {
      id: 'c1',
      type: 'asset',
      name: 'C',
      assetKind: 'fabric-cloth',
      screenImageId: null,
      sizeScale: 1,
      visible: true,
      physicsBodyMode: 'dynamic',
      physicsDensityKgPerM3: 1000,
      fabricClothParams: defaultFabricClothParams(),
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    };
    const root = new Group();
    const sourceMesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.45,
      faceHeight: 0.45,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 6, segmentsH: 6 },
    });
    root.add(sourceMesh);
    const binding = createFabricClothVerletBinding(sourceMesh, entity, root);
    flushBindingPlane(binding);

    const payload = bakeFabricClothMeshFromVerletBinding(binding, root, 2);
    const bakedMesh = new Mesh(
      buildBufferGeometryFromBakedMeshPayload(payload),
      new MeshBasicMaterial(),
    );
    bakedMesh.rotation.x = -Math.PI / 2;
    root.add(bakedMesh);

    const sourceBox = entityLocalBox(sourceMesh);
    const bakedBox = entityLocalBox(bakedMesh);
    const epsilon = 0.015;
    expect(Math.abs(sourceBox.min.y - bakedBox.min.y)).toBeLessThan(epsilon);
    expect(Math.abs(sourceBox.max.y - bakedBox.max.y)).toBeLessThan(epsilon);

    bakedMesh.geometry.dispose();
    sourceMesh.geometry.dispose();
  });

  it('alignFabricClothBakePayloadToSourceMesh is idempotent when already aligned', () => {
    const entity: AssetEntity = {
      id: 'c2',
      type: 'asset',
      name: 'C',
      assetKind: 'fabric-cloth',
      screenImageId: null,
      sizeScale: 1,
      visible: true,
      physicsBodyMode: 'dynamic',
      physicsDensityKgPerM3: 1000,
      fabricClothParams: defaultFabricClothParams(),
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    };
    const root = new Group();
    const sourceMesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.3,
      faceHeight: 0.3,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 4, segmentsH: 4 },
    });
    root.add(sourceMesh);
    const binding = createFabricClothVerletBinding(sourceMesh, entity, root);
    flushBindingPlane(binding);
    const payload = bakeFabricClothMeshFromVerletBinding(binding, root);
    const y0 = payload.positions[1];
    alignFabricClothBakePayloadToSourceMesh(sourceMesh, root, payload);
    expect(payload.positions[1]).toBeCloseTo(y0, 5);
    sourceMesh.geometry.dispose();
  });
});
