import {
  Box3,
  Object3D,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const UP = new Vector3(0, 1, 0);
const bounds = new Box3();
const focusScratch = new Vector3();
const pivotDelta = new Vector3();
const pointerNdc = new Vector2();
const raycaster = new Raycaster();
const fallbackPlane = new Plane();
const fallbackPoint = new Vector3();
const pickResult = new Vector3();

const MIN_FOCUS_MOVE_DISTANCE_SQ = 1e-10;

const DEFAULT_FOCUS = new Vector3(0, 0.25, 0);

/** World-space center of an object's bounds; falls back to studio default focus. */
export function getObjectWorldFocus(object: Object3D, out: Vector3 = focusScratch): Vector3 {
  bounds.setFromObject(object);
  if (bounds.isEmpty()) {
    out.copy(DEFAULT_FOCUS);
    return out;
  }
  return bounds.getCenter(out);
}

/**
 * Sets OrbitControls orbit pivot. When `preserveView` is true, translates the camera with the
 * pivot so the image does not jump (used after resize/rebuild or double-click focus).
 */
export function applyOrbitFocus(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  focus: Vector3,
  preserveView: boolean,
): void {
  if (preserveView && controls.target.distanceToSquared(focus) >= MIN_FOCUS_MOVE_DISTANCE_SQ) {
    pivotDelta.subVectors(focus, controls.target);
    camera.position.add(pivotDelta);
  }
  controls.target.copy(focus);
  controls.cursor.copy(focus);
}

/**
 * Raycast pivot for double-click focus (cloth, ground, pedestal).
 * Returned vector is reused; copy before the next pick.
 */
export function pickFocusPointFromPointer(
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
  camera: PerspectiveCamera,
  domElement: HTMLElement,
  pickables: Object3D[],
  pivotHintY: number,
): Vector3 | null {
  const rect = domElement.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  if (w <= 0 || h <= 0) return null;

  pointerNdc.set(
    ((event.clientX - rect.left) / w) * 2 - 1,
    -((event.clientY - rect.top) / h) * 2 + 1,
  );
  raycaster.setFromCamera(pointerNdc, camera);

  const hits = raycaster.intersectObjects(pickables, false);
  const first = hits[0];
  if (first) {
    pickResult.copy(first.point);
    return pickResult;
  }

  fallbackPlane.setFromNormalAndCoplanarPoint(UP, new Vector3(0, pivotHintY, 0));
  const onPlane = raycaster.ray.intersectPlane(fallbackPlane, fallbackPoint);
  if (!onPlane) return null;
  pickResult.copy(fallbackPoint);
  return pickResult;
}
