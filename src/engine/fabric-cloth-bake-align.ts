import { Box3, Euler, Matrix4, type Mesh, type Object3D, Vector3 } from 'three/webgpu';
import type { FabricClothBakedMeshPayload } from '@/scene/user-baked-asset';

/** Same as `addBakedFabricCloth` / live `buildFabricClothMesh`. */
export const FABRIC_CLOTH_MESH_ROTATION_X = -Math.PI / 2;

const _meshRot = new Matrix4().makeRotationFromEuler(
  new Euler(FABRIC_CLOTH_MESH_ROTATION_X, 0, 0),
);
const _meshRotInv = _meshRot.clone().invert();
const _point = new Vector3();
const _center = new Vector3();
const _bakedCenter = new Vector3();
function expandGeometryBoundsInEntityLocal(mesh: Mesh, target: Box3): void {
  mesh.updateMatrix();
  const position = mesh.geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    _point.fromBufferAttribute(position, i);
    _point.applyMatrix4(mesh.matrix);
    target.expandByPoint(_point);
  }
}

function expandPayloadBoundsInEntityLocal(
  payload: FabricClothBakedMeshPayload,
  target: Box3,
): void {
  const positions = payload.positions;
  for (let i = 0; i < positions.length; i += 3) {
    _point.set(positions[i], positions[i + 1], positions[i + 2]);
    _point.applyMatrix4(_meshRot);
    target.expandByPoint(_point);
  }
}

function translatePayloadMeshLocal(
  payload: FabricClothBakedMeshPayload,
  deltaEntity: Vector3,
): void {
  const positions = payload.positions;
  for (let i = 0; i < positions.length; i += 3) {
    _point.set(positions[i], positions[i + 1], positions[i + 2]);
    _point.applyMatrix4(_meshRot);
    _point.add(deltaEntity);
    _point.applyMatrix4(_meshRotInv);
    positions[i] = _point.x;
    positions[i + 1] = _point.y;
    positions[i + 2] = _point.z;
  }
}

/**
 * Shift baked vertices so entity-local AABB matches the live source cloth mesh at bake time.
 */
export function alignFabricClothBakePayloadToSourceMesh(
  sourceMesh: Mesh,
  _entityRoot: Object3D,
  payload: FabricClothBakedMeshPayload,
): void {
  const sourceBox = new Box3();
  const bakedBox = new Box3();
  expandGeometryBoundsInEntityLocal(sourceMesh, sourceBox);
  expandPayloadBoundsInEntityLocal(payload, bakedBox);

  if (sourceBox.isEmpty() || bakedBox.isEmpty()) {
    return;
  }

  sourceBox.getCenter(_center);
  bakedBox.getCenter(_bakedCenter);
  const delta = new Vector3(
    _center.x - _bakedCenter.x,
    sourceBox.min.y - bakedBox.min.y,
    _center.z - _bakedCenter.z,
  );
  if (delta.lengthSq() < 1e-12) {
    return;
  }
  translatePayloadMeshLocal(payload, delta);
}
