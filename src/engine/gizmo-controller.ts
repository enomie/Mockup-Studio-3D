import type { Camera, Object3D } from 'three/webgpu';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { upgradeGizmoMaterialsToWebGPU } from './gizmo-material-upgrade';

export type GizmoTransformMode = 'translate' | 'rotate' | 'scale';

export class GizmoController {
  private readonly controls: TransformControls;
  private readonly helper: Object3D;
  private attachedObject: Object3D | null = null;
  private onTransform: (() => void) | null = null;
  private onDraggingChanged: ((dragging: boolean) => void) | null = null;

  constructor(camera: Camera, domElement: HTMLElement) {
    this.controls = new TransformControls(camera, domElement);
    this.controls.setSpace('world');
    this.helper = this.controls.getHelper();
    upgradeGizmoMaterialsToWebGPU(this.helper);

    this.controls.addEventListener('objectChange', () => {
      this.onTransform?.();
    });

    this.controls.addEventListener('dragging-changed', (event) => {
      const dragging = (event as { value: boolean }).value;
      this.onDraggingChanged?.(dragging);
    });
  }

  getHelper(): Object3D {
    return this.helper;
  }

  setCallbacks(callbacks: {
    onTransform?: () => void;
    onDraggingChanged?: (dragging: boolean) => void;
  }): void {
    this.onTransform = callbacks.onTransform ?? null;
    this.onDraggingChanged = callbacks.onDraggingChanged ?? null;
  }

  updateCamera(camera: Camera): void {
    this.controls.camera = camera;
  }

  attach(object: Object3D | null): void {
    // TransformControls requires a parent; removed objects (pins, deleted assets) are skipped.
    const target = object?.parent ? object : null;
    this.attachedObject = target;
    if (target) {
      this.controls.attach(target);
    } else {
      this.controls.detach();
    }
  }

  /** Detaches when the attached object was removed from the scene. Returns true if it detached. */
  detachIfOrphaned(): boolean {
    if (!this.attachedObject || this.attachedObject.parent) {
      return false;
    }
    this.attach(null);
    return true;
  }

  getAttachedObject(): Object3D | null {
    return this.attachedObject;
  }

  setTransformMode(mode: GizmoTransformMode): void {
    this.controls.setMode(mode);
  }

  getTransformMode(): GizmoTransformMode {
    return this.controls.mode;
  }

  enforceUniformScale(): void {
    const object = this.controls.object;
    if (this.controls.mode !== 'scale') {return;}
    const uniform =
      (object.scale.x + object.scale.y + object.scale.z) / 3;
    object.scale.set(uniform, uniform, uniform);
  }

  setEnabled(enabled: boolean): void {
    const show = enabled && this.attachedObject !== null;
    this.controls.enabled = show;
    this.helper.visible = show;
  }

  isDragging(): boolean {
    return this.controls.dragging;
  }

  isPointerOverHandle(): boolean {
    return this.controls.axis !== null;
  }

  dispose(): void {
    this.controls.detach();
    this.controls.dispose();
  }
}
