import { defaultBlockParams, type BlockParams } from './asset-block';
import { defaultCylinderParams } from './asset-cylinder';
import { defaultSphereParams } from './asset-sphere';
import { wheelCarVolumeM3 } from '@/physics/wheel-car-collider-shape';
import { blockVolumeM3 } from '@/physics/block-collider-shape';
import { cylinderVolumeM3 } from '@/physics/cylinder-collider-shape';
import { sphereVolumeM3 } from '@/physics/sphere-collider-shape';
import type { AssetEntity } from './entity-types';
import { isRigidPrimitiveAssetKind } from './rigid-primitive-asset';
import { clamp } from '@/units/math';

export type PhysicsBodyMode = 'fixed' | 'dynamic';

export const DEFAULT_PHYSICS_DENSITY_KG_PER_M3 = 1000;
const PHYSICS_DENSITY_MIN_KG_PER_M3 = 50;
const PHYSICS_DENSITY_MAX_KG_PER_M3 = 15_000;

export function clampPhysicsDensityKgPerM3(value: number): number {
  return clamp(value, PHYSICS_DENSITY_MIN_KG_PER_M3, PHYSICS_DENSITY_MAX_KG_PER_M3);
}

export function normalizePhysicsBodyMode(mode: string): PhysicsBodyMode {
  return mode === 'fixed' ? 'fixed' : 'dynamic';
}

export function resolvePhysicsBodyMode(entity: AssetEntity): PhysicsBodyMode {
  return normalizePhysicsBodyMode(entity.physicsBodyMode ?? 'dynamic');
}

export function resolvePhysicsDensityKgPerM3(entity: AssetEntity): number {
  const raw = entity.physicsDensityKgPerM3;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return DEFAULT_PHYSICS_DENSITY_KG_PER_M3;
  }
  return clampPhysicsDensityKgPerM3(raw);
}

export function rigidMassKgFromVolumeM3(
  volumeM3: number,
  densityKgPerM3: number,
): number {
  return volumeM3 * densityKgPerM3;
}

function blockMassKgFromParams(
  params: BlockParams,
  densityKgPerM3: number,
): number {
  return rigidMassKgFromVolumeM3(blockVolumeM3(params), densityKgPerM3);
}

export function blockMassKgFromEntity(entity: AssetEntity): number {
  const params = entity.blockParams ?? defaultBlockParams();
  return blockMassKgFromParams(params, resolvePhysicsDensityKgPerM3(entity));
}

function cylinderMassKgFromEntity(entity: AssetEntity): number {
  const params = entity.cylinderParams ?? defaultCylinderParams();
  return rigidMassKgFromVolumeM3(
    cylinderVolumeM3(params),
    resolvePhysicsDensityKgPerM3(entity),
  );
}

function sphereMassKgFromEntity(entity: AssetEntity): number {
  const params = entity.sphereParams ?? defaultSphereParams();
  return rigidMassKgFromVolumeM3(
    sphereVolumeM3(params),
    resolvePhysicsDensityKgPerM3(entity),
  );
}

function wheelCarMassKgFromEntity(entity: AssetEntity): number {
  return rigidMassKgFromVolumeM3(
    wheelCarVolumeM3(entity.sizeScale, entity.wheelCarParams?.profileId),
    resolvePhysicsDensityKgPerM3(entity),
  );
}

export function rigidMassKgFromEntity(entity: AssetEntity): number {
  if (!isRigidPrimitiveAssetKind(entity.assetKind)) {
    return blockMassKgFromEntity(entity);
  }
  switch (entity.assetKind) {
    case 'block':
      return blockMassKgFromEntity(entity);
    case 'cylinder':
      return cylinderMassKgFromEntity(entity);
    case 'sphere':
      return sphereMassKgFromEntity(entity);
    case 'wheel-car':
      return wheelCarMassKgFromEntity(entity);
  }
}
