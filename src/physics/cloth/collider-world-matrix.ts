import { Matrix4, Quaternion, Vector3, type Object3D } from 'three/webgpu';
import type { Quat } from '@/physics/types';

const _local = new Matrix4();
const _world = new Matrix4();
const _quat = new Quaternion();
const _offset = new Vector3();

export interface ColliderWorldMatrices {
  matrixWorld: Float32Array;
  matrixWorldInverse: Float32Array;
}

export function colliderWorldMatricesFromObject(
  object: Object3D,
  centerOffsetY: number,
  localRotation?: Quat,
): ColliderWorldMatrices {
  object.updateWorldMatrix(true, true);

  _local.identity();
  _offset.set(0, centerOffsetY, 0);
  _local.makeTranslation(_offset.x, _offset.y, _offset.z);
  if (localRotation) {
    _quat.set(localRotation.x, localRotation.y, localRotation.z, localRotation.w);
    _local.multiply(new Matrix4().makeRotationFromQuaternion(_quat));
  }

  _world.copy(object.matrixWorld).multiply(_local);

  const matrixWorld = new Float32Array(16);
  const matrixWorldInverse = new Float32Array(16);
  _world.toArray(matrixWorld);
  _world.invert().toArray(matrixWorldInverse);

  return { matrixWorld, matrixWorldInverse };
}

export function worldPointFromObjectLocal(
  object: Object3D,
  localX: number,
  localY: number,
  localZ: number,
): Vector3 {
  object.updateWorldMatrix(true, true);
  return new Vector3(localX, localY, localZ).applyMatrix4(object.matrixWorld);
}
