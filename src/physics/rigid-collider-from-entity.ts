import { defaultBlockParams } from '@/scene/asset-block';
import { defaultCylinderParams } from '@/scene/asset-cylinder';
import { defaultSphereParams } from '@/scene/asset-sphere';
import { wheelCarColliderShapeFromSizeScale } from './wheel-car-collider-shape';
import type { AssetEntity } from '@/scene/entity-types';
import { isRigidPrimitiveAssetKind } from '@/scene/rigid-primitive-asset';
import { blockColliderShapeFromParams } from './block-collider-shape';
import { cylinderColliderShapeFromParams } from './cylinder-collider-shape';
import type { RigidColliderShape } from './rigid-collider-desc';
import { sphereColliderShapeFromParams } from './sphere-collider-shape';

export function rigidColliderShapeFromEntity(
  entity: AssetEntity,
): RigidColliderShape | null {
  if (!isRigidPrimitiveAssetKind(entity.assetKind)) {return null;}

  switch (entity.assetKind) {
    case 'block':
      return {
        kind: 'block',
        shape: blockColliderShapeFromParams(
          entity.blockParams ?? defaultBlockParams(),
        ),
      };
    case 'cylinder':
      return {
        kind: 'cylinder',
        shape: cylinderColliderShapeFromParams(
          entity.cylinderParams ?? defaultCylinderParams(),
        ),
      };
    case 'sphere':
      return {
        kind: 'sphere',
        shape: sphereColliderShapeFromParams(
          entity.sphereParams ?? defaultSphereParams(),
        ),
      };
    case 'wheel-car':
      return {
        kind: 'wheelCar',
        shape: wheelCarColliderShapeFromSizeScale(
          entity.sizeScale,
          entity.wheelCarParams?.profileId,
        ),
      };
  }
}
