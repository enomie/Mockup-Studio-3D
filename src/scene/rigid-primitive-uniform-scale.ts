import {
  defaultBlockParams,
  type BlockParams,
} from './asset-block';
import {
  defaultCylinderParams,
  type CylinderParams,
} from './asset-cylinder';
import {
  defaultSphereParams,
  type SphereParams,
} from './asset-sphere';
import {
  defaultWheelCarParams,
  type WheelCarParams,
} from './asset-wheel-car';
import { clampSizeScale } from './asset-sizing';
import type { AssetEntity } from './entity-types';
import { isRigidPrimitiveAssetKind } from './rigid-primitive-asset';

const SCALE_FACTOR_EPSILON = 1e-9;

export type RigidPrimitiveScaleParamPatch =
  | Partial<BlockParams>
  | Partial<CylinderParams>
  | Partial<SphereParams>
  | Partial<WheelCarParams>;

/** Gizmo uniform scale factor → absolute param values (before mergeKindParamPatch clamp). */
export function buildRigidPrimitiveUniformScalePartial(
  entity: AssetEntity,
  factor: number,
): RigidPrimitiveScaleParamPatch | null {
  if (!isRigidPrimitiveAssetKind(entity.assetKind)) {
    return null;
  }

  const scaledFactor = clampSizeScale(factor);
  if (
    scaledFactor <= 0 ||
    Math.abs(scaledFactor - 1) <= SCALE_FACTOR_EPSILON
  ) {
    return null;
  }

  switch (entity.assetKind) {
    case 'block': {
      const current = entity.blockParams ?? defaultBlockParams();
      return {
        widthM: current.widthM * scaledFactor,
        heightM: current.heightM * scaledFactor,
        depthM: current.depthM * scaledFactor,
        cornerRadiusMm: current.cornerRadiusMm * scaledFactor,
      };
    }
    case 'cylinder': {
      const current = entity.cylinderParams ?? defaultCylinderParams();
      return {
        radiusM: current.radiusM * scaledFactor,
        heightM: current.heightM * scaledFactor,
        cornerRadiusMm: current.cornerRadiusMm * scaledFactor,
      };
    }
    case 'sphere': {
      const current = entity.sphereParams ?? defaultSphereParams();
      return {
        radiusM: current.radiusM * scaledFactor,
      };
    }
    case 'wheel-car': {
      const current = entity.wheelCarParams ?? defaultWheelCarParams();
      return {
        outerRadiusM: current.outerRadiusM * scaledFactor,
        tireWidthM: current.tireWidthM * scaledFactor,
        rimRadiusM: current.rimRadiusM * scaledFactor,
        rimInsetM: current.rimInsetM * scaledFactor,
        hubRadiusM: current.hubRadiusM * scaledFactor,
        hubDepthM: current.hubDepthM * scaledFactor,
        tireCornerRadiusMm: current.tireCornerRadiusMm * scaledFactor,
      };
    }
  }
}
