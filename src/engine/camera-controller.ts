import {
  type Camera,
  OrthographicCamera,
  PerspectiveCamera,
  Spherical,
  Vector2,
  Vector3,
} from 'three/webgpu';
import type { CameraNormalViewDefaults } from '@/config/scene-defaults';
import type { BuiltinCameraViewDefinition } from '@/data/camera-views';
import {
  CAMERA_DEFAULT_AZIMUTH_DEG,
  CAMERA_DEFAULT_ELEVATION_DEG,
  CAMERA_FOV,
  CAMERA_ORBIT_DEFAULT_RADIUS,
  CAMERA_ORBIT_MAX_RADIUS,
  CAMERA_ORBIT_MIN_RADIUS,
  CAMERA_ORBIT_SENSITIVITY,
  CAMERA_ORTHO_MAX_ZOOM,
  CAMERA_ORTHO_MIN_ZOOM,
  CAMERA_PAN_SENSITIVITY,
  CAMERA_TARGET_Y,
  CAMERA_ZOOM_SPEED,
  FRUSTUM_SIZE,
} from '@/constants';
import type { CameraProjection, CameraReadout, CameraViewState } from '@/scene/scene-api';
import type { Vec3 } from '@/scene/entity-types';
import { DEG_TO_RAD } from '@/units/angle';

export type { CameraProjection };

type DragMode = 'orbit' | 'pan';
const ORBIT_PHI_MIN = 0.12;
const ORBIT_PHI_MAX = Math.PI - ORBIT_PHI_MIN;

const _panDelta = new Vector3();
const _panRight = new Vector3();
const _panUp = new Vector3();
const _pointerPrev = new Vector2();
const _offset = new Vector3();

export class CameraController {
  private readonly perspective: PerspectiveCamera;
  private readonly orthographic: OrthographicCamera;
  private readonly target = new Vector3(0, CAMERA_TARGET_Y, 0);
  private readonly spherical = new Spherical(
    CAMERA_ORBIT_DEFAULT_RADIUS,
    Math.PI / 2 - CAMERA_DEFAULT_ELEVATION_DEG * DEG_TO_RAD,
    CAMERA_DEFAULT_AZIMUTH_DEG * DEG_TO_RAD,
  );

  private domElement: HTMLElement | null = null;
  private activeProjection: CameraProjection = 'perspective';
  private orthoZoom = 1;
  private aspect = 1;

  private spaceDown = false;
  private orbitEnabled = true;
  private dragMode: DragMode | null = null;
  private prevTouchCenter: Vector2 | null = null;
  private prevTouchDistance = 0;
  private changeListener: (() => void) | null = null;
  private viewportActivityListener: (() => void) | null = null;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.shouldIgnoreKeyboard(event)) {return;}
    if (event.code === 'Space') {
      event.preventDefault();
      this.spaceDown = true;
      this.updateCursor();
    }
    if (event.code === 'KeyO' && !event.repeat) {
      this.setProjection(
        this.activeProjection === 'perspective' ? 'orthographic' : 'perspective',
      );
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      event.preventDefault();
      this.spaceDown = false;
      this.updateCursor();
    }
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const factor = 1 + event.deltaY * CAMERA_ZOOM_SPEED * 0.01;
    this.zoom(factor);
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  constructor() {
    this.perspective = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 2000);
    this.orthographic = new OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
    this.applySphericalToPerspective();
    this.updateOrthographicProjection();
  }

  get camera(): Camera {
    return this.activeProjection === 'perspective'
      ? this.perspective
      : this.orthographic;
  }

  get projection(): CameraProjection {
    return this.activeProjection;
  }

  setChangeListener(listener: (() => void) | null): void {
    this.changeListener = listener;
  }

  /** Fired on drag/pinch moves so the viewport can wake from render-on-demand idle. */
  setViewportActivityListener(listener: (() => void) | null): void {
    this.viewportActivityListener = listener;
  }

  isSpaceDown(): boolean {
    return this.spaceDown;
  }

  isOrbitEnabled(): boolean {
    return this.orbitEnabled;
  }

  /** True while orbit/pan drag or two-finger pinch is active. */
  isInteracting(): boolean {
    return this.dragMode !== null || this.prevTouchCenter !== null;
  }

  setOrbitEnabled(enabled: boolean): void {
    this.orbitEnabled = enabled;
    if (!enabled) {
      this.dragMode = null;
    }
    this.updateCursor();
  }

  getViewState(): CameraViewState {
    const cam = this.camera;
    return {
      projection: this.activeProjection,
      position: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
      target: { x: this.target.x, y: this.target.y, z: this.target.z },
      fov: this.perspective.fov,
      orthoZoom: this.orthoZoom,
    };
  }

  getReadout(): CameraReadout {
    const view = this.getViewState();
    const azimuthDeg = (this.spherical.theta * 180) / Math.PI;
    const elevationDeg = ((Math.PI / 2 - this.spherical.phi) * 180) / Math.PI;
    return {
      position: view.position,
      target: view.target,
      distance: this.spherical.radius,
      azimuthDeg,
      elevationDeg,
    };
  }

  applyFramingState(state: CameraViewState): void {
    this.target.set(state.target.x, state.target.y, state.target.z);
    this.orthoZoom = state.orthoZoom;
    this.perspective.fov = state.fov;
    this.perspective.updateProjectionMatrix();

    _offset.set(state.position.x, state.position.y, state.position.z).sub(this.target);
    this.spherical.setFromVector3(_offset);
    this.applyActiveProjection();
    this.notifyChange();
  }

  applyViewState(state: CameraViewState): void {
    this.applyFramingState(state);
    if (state.projection !== this.activeProjection) {
      this.activeProjection = state.projection;
      this.applyActiveProjection();
      this.notifyChange();
    }
  }

  resetToNormal(defaults: CameraNormalViewDefaults): void {
    this.target.set(defaults.target.x, defaults.target.y, defaults.target.z);
    this.spherical.radius = defaults.spherical.radius;
    this.spherical.phi = defaults.spherical.phi;
    this.spherical.theta = defaults.spherical.theta;
    this.orthoZoom = defaults.orthoZoom;
    this.perspective.fov = defaults.fov;
    this.perspective.updateProjectionMatrix();
    this.applyActiveProjection();
    this.notifyChange();
  }

  loadBuiltinView(definition: BuiltinCameraViewDefinition): void {
    this.target.set(definition.target.x, definition.target.y, definition.target.z);
    this.spherical.radius = definition.spherical.radius;
    this.spherical.phi = definition.spherical.phi;
    this.spherical.theta = definition.spherical.theta;
    this.applyActiveProjection();
    this.notifyChange();
  }

  beginDrag(mode: DragMode, clientX: number, clientY: number): void {
    this.dragMode = mode;
    _pointerPrev.set(clientX, clientY);
    this.updateCursor();
    this.signalViewportActivity();
  }

  updateDrag(clientX: number, clientY: number): void {
    if (!this.dragMode) {return;}

    const dx = clientX - _pointerPrev.x;
    const dy = clientY - _pointerPrev.y;
    _pointerPrev.set(clientX, clientY);

    if (this.dragMode === 'pan') {
      this.pan(dx, dy);
    } else {
      this.orbit(dx, dy);
    }
    this.signalViewportActivity();
  }

  endDrag(): void {
    this.dragMode = null;
    this.updateCursor();
    this.notifyChange();
  }

  beginPinch(pointers: Map<number, Vector2>): void {
    const points = [...pointers.values()];
    if (points.length < 2) {return;}

    this.endDrag();
    this.prevTouchCenter = new Vector2(
      (points[0].x + points[1].x) * 0.5,
      (points[0].y + points[1].y) * 0.5,
    );
    this.prevTouchDistance = points[0].distanceTo(points[1]);
    this.signalViewportActivity();
  }

  updatePinch(pointers: Map<number, Vector2>): void {
    const points = [...pointers.values()];
    if (points.length < 2) {return;}

    const center = new Vector2(
      (points[0].x + points[1].x) * 0.5,
      (points[0].y + points[1].y) * 0.5,
    );
    const distance = points[0].distanceTo(points[1]);

    if (this.prevTouchCenter) {
      this.pan(center.x - this.prevTouchCenter.x, center.y - this.prevTouchCenter.y);
    }

    if (this.prevTouchDistance > 0 && distance > 0) {
      this.zoom(this.prevTouchDistance / distance);
    }

    this.prevTouchCenter = center;
    this.prevTouchDistance = distance;
    this.signalViewportActivity();
  }

  endPinch(): void {
    this.prevTouchCenter = null;
    this.prevTouchDistance = 0;
    this.notifyChange();
  }

  attach(domElement: HTMLElement): void {
    this.domElement = domElement;
    domElement.style.touchAction = 'none';

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    domElement.addEventListener('wheel', this.onWheel, { passive: false });
    domElement.addEventListener('contextmenu', this.onContextMenu);

    this.updateCursor();
  }

  detach(): void {
    if (!this.domElement) {return;}

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);

    this.domElement.style.cursor = '';
    this.domElement = null;
  }

  setProjection(projection: CameraProjection): void {
    if (this.activeProjection === projection) {return;}

    if (this.activeProjection === 'perspective') {
      _offset.copy(this.perspective.position).sub(this.target);
      this.spherical.setFromVector3(_offset);
    }

    this.activeProjection = projection;
    this.applyActiveProjection();
    this.notifyChange();
  }

  setFov(fov: number): void {
    this.perspective.fov = fov;
    this.perspective.updateProjectionMatrix();
    this.notifyChange();
  }

  setOrthoZoom(zoom: number): void {
    this.orthoZoom = zoom;
    this.updateOrthographicProjection();
    this.notifyChange();
  }

  setTarget(partial: Partial<Vec3>): void {
    if (partial.x !== undefined) {this.target.x = partial.x;}
    if (partial.y !== undefined) {this.target.y = partial.y;}
    if (partial.z !== undefined) {this.target.z = partial.z;}
    this.applyActiveProjection();
    this.notifyChange();
  }

  setPosition(partial: Partial<Vec3>): void {
    const cam = this.camera;
    const x = partial.x ?? cam.position.x;
    const y = partial.y ?? cam.position.y;
    const z = partial.z ?? cam.position.z;
    _offset.set(x, y, z).sub(this.target);
    this.spherical.setFromVector3(_offset);
    this.applyActiveProjection();
    this.notifyChange();
  }

  setOrbitDistance(distanceM: number): void {
    this.spherical.radius = distanceM;
    this.applyActiveProjection();
    this.notifyChange();
  }

  setAzimuthDeg(degrees: number): void {
    this.spherical.theta = degrees * DEG_TO_RAD;
    this.applyActiveProjection();
    this.notifyChange();
  }

  setElevationDeg(degrees: number): void {
    this.spherical.phi = Math.PI / 2 - degrees * DEG_TO_RAD;
    this.clampOrbitPhi();
    this.applyActiveProjection();
    this.notifyChange();
  }

  resetAzimuth(): void {
    this.setAzimuthDeg(0);
  }

  resetElevation(): void {
    this.setElevationDeg(0);
  }

  handleResize(width: number, height: number): void {
    if (width === 0 || height === 0) {return;}
    this.aspect = width / height;
    this.perspective.aspect = this.aspect;
    this.perspective.updateProjectionMatrix();
    this.updateOrthographicProjection();
  }

  private clampOrbitRadius(): void {
    this.spherical.radius = Math.max(
      CAMERA_ORBIT_MIN_RADIUS,
      Math.min(CAMERA_ORBIT_MAX_RADIUS, this.spherical.radius),
    );
  }

  private clampOrbitPhi(): void {
    this.spherical.phi = Math.max(
      ORBIT_PHI_MIN,
      Math.min(ORBIT_PHI_MAX, this.spherical.phi),
    );
  }

  private applyActiveProjection(): void {
    this.clampOrbitRadius();
    this.clampOrbitPhi();

    if (this.activeProjection === 'perspective') {
      this.applySphericalToPerspective();
      return;
    }

    _offset.setFromSpherical(this.spherical);
    this.applySphericalToOrthographic(_offset);
    this.updateOrthographicProjection();
  }

  private orbit(dx: number, dy: number): void {
    this.spherical.theta -= dx * CAMERA_ORBIT_SENSITIVITY;
    this.spherical.phi += dy * CAMERA_ORBIT_SENSITIVITY;
    this.clampOrbitPhi();
    this.applyActiveProjection();
  }

  private pan(dx: number, dy: number): void {
    const cam =
      this.activeProjection === 'perspective' ? this.perspective : this.orthographic;
    cam.updateMatrixWorld();

    const distance =
      this.activeProjection === 'perspective'
        ? this.spherical.radius
        : FRUSTUM_SIZE / this.orthoZoom;
    const scale = distance * CAMERA_PAN_SENSITIVITY;

    _panRight.setFromMatrixColumn(cam.matrix, 0);
    _panUp.setFromMatrixColumn(cam.matrix, 1);

    _panDelta.set(0, 0, 0);
    _panDelta.addScaledVector(_panRight, -dx * scale);
    _panDelta.addScaledVector(_panUp, dy * scale);

    this.target.add(_panDelta);
    cam.position.add(_panDelta);
  }

  private zoom(factor: number): void {
    if (this.activeProjection === 'perspective') {
      this.spherical.radius *= factor;
      this.clampOrbitRadius();
      this.applySphericalToPerspective();
    } else {
      this.orthoZoom = Math.max(
        CAMERA_ORTHO_MIN_ZOOM,
        Math.min(CAMERA_ORTHO_MAX_ZOOM, this.orthoZoom * factor),
      );
      this.updateOrthographicProjection();
    }

    this.notifyChange();
  }

  private applySphericalToPerspective(): void {
    _offset.setFromSpherical(this.spherical);
    this.perspective.position.copy(this.target).add(_offset);
    this.syncCameraUp(this.spherical.phi);
    this.perspective.lookAt(this.target);
  }

  private applySphericalToOrthographic(offset: Vector3): void {
    this.orthographic.position.copy(this.target).add(offset);
    this.syncCameraUp(this.spherical.phi);
    this.orthographic.lookAt(this.target);
  }

  /** Pole-safe up vector — default (0,1,0) gimbal-locks at top/bottom. */
  private syncCameraUp(phi: number): void {
    const poleThreshold = 0.2;
    if (phi < poleThreshold) {
      this.perspective.up.set(0, 0, -1);
      this.orthographic.up.set(0, 0, -1);
      return;
    }
    if (phi > Math.PI - poleThreshold) {
      this.perspective.up.set(0, 0, 1);
      this.orthographic.up.set(0, 0, 1);
      return;
    }
    this.perspective.up.set(0, 1, 0);
    this.orthographic.up.set(0, 1, 0);
  }

  private updateOrthographicProjection(): void {
    const halfH = FRUSTUM_SIZE / (2 * this.orthoZoom);
    const halfW = halfH * this.aspect;
    this.orthographic.left = -halfW;
    this.orthographic.right = halfW;
    this.orthographic.top = halfH;
    this.orthographic.bottom = -halfH;
    this.orthographic.updateProjectionMatrix();
  }

  private notifyChange(): void {
    this.changeListener?.();
  }

  private signalViewportActivity(): void {
    this.viewportActivityListener?.();
  }

  private shouldIgnoreKeyboard(event: KeyboardEvent): boolean {
    const tag = (event.target as HTMLElement | null)?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  private updateCursor(): void {
    if (!this.domElement) {return;}
    if (this.spaceDown || this.dragMode === 'pan') {
      this.domElement.style.cursor = this.dragMode === 'pan' ? 'grabbing' : 'grab';
    } else {
      this.domElement.style.cursor = 'default';
    }
  }
}
