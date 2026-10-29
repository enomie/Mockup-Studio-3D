import { Box3, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { defaultFabricClothParams } from '@/scene/asset-fabric-cloth';
import type { AssetEntity } from '@/scene/entity-types';
import { vec3Get, vec3Set } from '@/physics/cloth/float-buffer';
import { buildFabricClothMeshFromOptions } from './fabric-cloth-geometry';
import {
  bakeFabricClothMeshFromVerletBinding,
  buildBufferGeometryFromBakedMeshPayload,
} from './fabric-cloth-bake';
import {
  createFabricClothVerletBinding,
  fabricClothMeshLocalCenterlineFromBinding,
  flushBindingPlane,
} from './fabric-cloth-verlet-session';

function makeClothEntity(): AssetEntity {
  return {
    id: 'cloth-bake',
    type: 'asset',
    name: 'Cloth',
    assetKind: 'fabric-cloth',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    physicsBodyMode: 'dynamic',
    physicsDensityKgPerM3: 1000,
    fabricClothParams: defaultFabricClothParams(),
    transform: {
      position: { x: 1.2, y: 0.4, z: -0.25 },
      rotation: { x: 0, y: 0.3, z: 0 },
    },
  };
}

function meshEntityLocalBounds(mesh: Mesh, entityRoot: Group): Box3 {
  const box = new Box3();
  entityRoot.updateWorldMatrix(true, true);
  mesh.updateMatrix();
  const position = mesh.geometry.getAttribute('position');
  const point = new Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    point.applyMatrix4(mesh.matrix);
    box.expandByPoint(point);
  }
  return box;
}

function centerlineEntityLocalBounds(
  binding: ReturnType<typeof createFabricClothVerletBinding>,
  entityRoot: Group,
): Box3 {
  const centerline = fabricClothMeshLocalCenterlineFromBinding(binding);
  const box = new Box3();
  entityRoot.updateWorldMatrix(true, true);
  binding.clothMesh.updateMatrix();
  const point = new Vector3();
  for (let i = 0; i < binding.numVertices; i++) {
    point.set(
      centerline[i * 3],
      centerline[i * 3 + 1],
      centerline[i * 3 + 2],
    );
    point.applyMatrix4(binding.clothMesh.matrix);
    box.expandByPoint(point);
  }
  return box;
}

describe('fabric cloth bake roundtrip (entity-local AABB)', () => {
  it('baked stiff mesh matches Verlet centerline footprint in entity space', () => {
    const entity = makeClothEntity();
    const entityRoot = new Group();
    entityRoot.position.set(
      entity.transform.position.x,
      entity.transform.position.y,
      entity.transform.position.z,
    );
    entityRoot.rotation.set(
      entity.transform.rotation.x,
      entity.transform.rotation.y,
      entity.transform.rotation.z,
    );

    const sourceMesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.45,
      faceHeight: 0.35,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 10, segmentsH: 8 },
    });
    entityRoot.add(sourceMesh);

    const binding = createFabricClothVerletBinding(sourceMesh, entity, entityRoot);
    const [wx, wy, wz] = vec3Get(binding.pos, 0);
    vec3Set(binding.pos, 0, wx, wy - 0.12, wz + 0.05);
    const mid = Math.floor(binding.numVertices / 2);
    const [mx, my, mz] = vec3Get(binding.pos, mid);
    vec3Set(binding.pos, mid, mx + 0.04, my - 0.08, mz);

    flushBindingPlane(binding);

    const referenceBounds = centerlineEntityLocalBounds(binding, entityRoot);
    const payload = bakeFabricClothMeshFromVerletBinding(binding, entityRoot, 2);
    const bakedGeometry = buildBufferGeometryFromBakedMeshPayload(payload);
    const bakedMesh = new Mesh(bakedGeometry, new MeshBasicMaterial());
    bakedMesh.rotation.x = -Math.PI / 2;
    entityRoot.add(bakedMesh);

    const bakedBounds = meshEntityLocalBounds(bakedMesh, entityRoot);

    const epsilon = 0.02;
    expect(bakedBounds.min.x).toBeCloseTo(referenceBounds.min.x, 1);
    expect(bakedBounds.max.x).toBeCloseTo(referenceBounds.max.x, 1);
    expect(bakedBounds.min.y).toBeCloseTo(referenceBounds.min.y, 1);
    expect(bakedBounds.max.y).toBeCloseTo(referenceBounds.max.y, 1);
    expect(bakedBounds.min.z).toBeCloseTo(referenceBounds.min.z, 1);
    expect(bakedBounds.max.z).toBeCloseTo(referenceBounds.max.z, 1);

    expect(Math.abs(bakedBounds.min.x - referenceBounds.min.x)).toBeLessThan(epsilon);
    expect(Math.abs(bakedBounds.max.x - referenceBounds.max.x)).toBeLessThan(epsilon);
    expect(Math.abs(bakedBounds.min.y - referenceBounds.min.y)).toBeLessThan(epsilon);
    expect(Math.abs(bakedBounds.max.y - referenceBounds.max.y)).toBeLessThan(epsilon);
    expect(Math.abs(bakedBounds.min.z - referenceBounds.min.z)).toBeLessThan(epsilon);
    expect(Math.abs(bakedBounds.max.z - referenceBounds.max.z)).toBeLessThan(epsilon);

    bakedGeometry.dispose();
    sourceMesh.geometry.dispose();
  });
});
