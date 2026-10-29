import { Box3, type Object3D, Vector3 } from 'three/webgpu';
import {
  SHADOW_COVERAGE_CONTENT_PADDING_M,
  SHADOW_COVERAGE_RADIUS,
  SHADOW_COVERAGE_RADIUS_MIN,
} from '@/constants';
import type { Vec3 } from '@/scene/entity-types';

const _union = new Box3();
const _objectBox = new Box3();
const _center = new Vector3();

/**
 * Horizontal coverage radius (m) at the light target for spot shadow frustum.
 * Tightens on small entity layouts; caps at SHADOW_COVERAGE_RADIUS.
 */
export function computeSceneShadowCoverageRadius(
  entityRoots: readonly Object3D[],
  sceneCenter: Vec3,
): number {
  let hasContent = false;
  _union.makeEmpty();

  for (const root of entityRoots) {
    _objectBox.setFromObject(root);
    if (_objectBox.isEmpty()) {
      continue;
    }
    if (!hasContent) {
      _union.copy(_objectBox);
      hasContent = true;
    } else {
      _union.union(_objectBox);
    }
  }

  if (!hasContent) {
    return SHADOW_COVERAGE_RADIUS;
  }

  _center.set(sceneCenter.x, sceneCenter.y, sceneCenter.z);
  const halfX = Math.max(
    Math.abs(_union.max.x - _center.x),
    Math.abs(_center.x - _union.min.x),
  );
  const halfZ = Math.max(
    Math.abs(_union.max.z - _center.z),
    Math.abs(_center.z - _union.min.z),
  );
  const horizontalExtent =
    Math.max(halfX, halfZ) + SHADOW_COVERAGE_CONTENT_PADDING_M;

  return Math.min(
    SHADOW_COVERAGE_RADIUS,
    Math.max(SHADOW_COVERAGE_RADIUS_MIN, horizontalExtent),
  );
}
