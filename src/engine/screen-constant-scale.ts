import type { Camera, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three/webgpu';
import { CAMERA_FOV, CAMERA_ORBIT_DEFAULT_RADIUS } from '@/constants';

/** Never collapse a helper to nothing when the camera sits on top of it. */
const MIN_SCALE = 1e-3;

/** World height covered by the default view at the default orbit radius (the "looks like today" reference). */
const REFERENCE_VISIBLE_HEIGHT = 2 * CAMERA_ORBIT_DEFAULT_RADIUS * Math.tan((CAMERA_FOV * Math.PI) / 360);

/**
 * Scale that keeps an overlay helper (points, handles, rings) at the same size on screen at any
 * zoom. 1 means the helper's modelled size, shown at the default view; the factor grows with the
 * visible world height at `worldPosition`, so a helper covers the same pixels near and far.
 */
export function screenConstantScale(camera: Camera, worldPosition: Vector3): number {
  const visibleHeight = isOrthographic(camera)
    ? (camera.top - camera.bottom) / camera.zoom
    : (2 * camera.position.distanceTo(worldPosition) * Math.tan((camera as PerspectiveCamera).fov * Math.PI / 360)) /
      (camera as PerspectiveCamera).zoom;
  return Math.max(MIN_SCALE, visibleHeight / REFERENCE_VISIBLE_HEIGHT);
}

function isOrthographic(camera: Camera): camera is OrthographicCamera {
  return 'isOrthographicCamera' in camera && camera.isOrthographicCamera === true;
}
