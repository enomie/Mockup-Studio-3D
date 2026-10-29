import { Vector2 } from 'three/webgpu';
import { VIEWPORT_CLICK_DRAG_THRESHOLD_PX } from '@/constants';
import type { CameraController } from './camera-controller';
import type { GizmoController } from './gizmo-controller';
import type { SelectionController } from './selection-controller';

type DragMode = 'orbit' | 'pan';

export class ViewportInputController {
  private readonly domElement: HTMLElement;
  private readonly camera: CameraController;
  private readonly selection: SelectionController;
  private readonly gizmo: GizmoController;

  private activePointerId: number | null = null;
  private activeButton = -1;
  private readonly pointerDownPos = new Vector2();
  private dragStarted = false;
  private dragMode: DragMode | null = null;
  private pendingHitId: string | null | undefined = undefined;
  private gizmoConsumedPointer = false;
  private patchLengthDragging = false;

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointers.set(event.pointerId, new Vector2(event.clientX, event.clientY));

    if (this.pointers.size === 2) {
      this.cancelPendingClick();
      this.camera.beginPinch(this.pointers);
      return;
    }

    if (this.pointers.size > 2) {return;}

    if (event.button === 1 || event.button === 2) {
      event.preventDefault();
      this.activePointerId = event.pointerId;
      this.activeButton = event.button;
      this.pointerDownPos.set(event.clientX, event.clientY);
      this.dragStarted = false;
      this.dragMode = 'pan';
      this.pendingHitId = undefined;
      this.gizmoConsumedPointer = false;
      return;
    }

    if (event.button !== 0) {return;}

    if (this.selection.beginPatchLengthDragAt(event.clientX, event.clientY)) {
      event.preventDefault();
      this.activePointerId = event.pointerId;
      this.activeButton = 0;
      this.patchLengthDragging = true;
      this.domElement.setPointerCapture(event.pointerId);
      return;
    }

    if (this.gizmo.isPointerOverHandle()) {
      this.gizmoConsumedPointer = true;
      return;
    }

    this.activePointerId = event.pointerId;
    this.activeButton = 0;
    this.pointerDownPos.set(event.clientX, event.clientY);
    this.dragStarted = false;
    this.dragMode = null;
    this.pendingHitId = this.selection.pickAt(event.clientX, event.clientY);
    this.gizmoConsumedPointer = false;
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) {return;}

    this.pointers.set(event.pointerId, new Vector2(event.clientX, event.clientY));

    if (this.pointers.size === 2) {
      this.camera.updatePinch(this.pointers);
      return;
    }

    if (this.activePointerId !== event.pointerId) {return;}
    if (this.patchLengthDragging) {
      this.selection.updatePatchLengthDragAt(event.clientX, event.clientY);
      return;
    }
    if (this.gizmoConsumedPointer || this.gizmo.isDragging()) {return;}

    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    const distance = Math.hypot(dx, dy);

    if (!this.dragStarted && distance >= VIEWPORT_CLICK_DRAG_THRESHOLD_PX) {
      this.dragStarted = true;
      this.pendingHitId = undefined;

      const mode: DragMode =
        this.activeButton !== 0 || this.camera.isSpaceDown() ? 'pan' : 'orbit';

      if (mode === 'orbit' && !this.camera.isOrbitEnabled()) {
        this.dragMode = null;
        return;
      }

      this.dragMode = mode;
      this.camera.beginDrag(mode, event.clientX, event.clientY);
      this.domElement.setPointerCapture(event.pointerId);
      event.preventDefault();
    }

    if (this.dragStarted && this.dragMode) {
      this.camera.updateDrag(event.clientX, event.clientY);
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);

    if (this.pointers.size === 1) {
      const nextEntry = this.pointers.entries().next();
      if (nextEntry.done) {return;}
      const remaining = nextEntry.value;
      this.activePointerId = remaining[0];
      this.pointerDownPos.copy(remaining[1]);
      this.dragStarted = false;
      this.dragMode = this.camera.isSpaceDown() ? 'pan' : 'orbit';
      return;
    }

    if (this.pointers.size === 0) {
      this.camera.endDrag();
      this.camera.endPinch();
    }

    if (this.activePointerId !== event.pointerId) {return;}

    if (this.patchLengthDragging) {
      this.selection.endPatchLengthDrag();
      if (this.domElement.hasPointerCapture(event.pointerId)) {
        this.domElement.releasePointerCapture(event.pointerId);
      }
      this.resetPointerState();
      return;
    }

    const wasClick =
      !this.dragStarted &&
      !this.gizmoConsumedPointer &&
      !this.gizmo.isDragging() &&
      this.activeButton === 0 &&
      this.pendingHitId !== undefined;

    if (wasClick) {
      if (this.pendingHitId === '__PATCH_HANDLE_SELECTED__') {
        // Point handle was selected directly in pickAt
      } else if (this.pendingHitId) {
        this.selection.selectEntity(this.pendingHitId);
      } else {
        this.selection.deselect();
      }
    }

    if (this.domElement.hasPointerCapture(event.pointerId)) {
      this.domElement.releasePointerCapture(event.pointerId);
    }
    this.resetPointerState();
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    this.onPointerUp(event);
  };

  private readonly pointers = new Map<number, Vector2>();

  constructor(
    domElement: HTMLElement,
    camera: CameraController,
    selection: SelectionController,
    gizmo: GizmoController,
  ) {
    this.domElement = domElement;
    this.camera = camera;
    this.selection = selection;
    this.gizmo = gizmo;

    domElement.addEventListener('pointerdown', this.onPointerDown);
    domElement.addEventListener('pointermove', this.onPointerMove);
    domElement.addEventListener('pointerup', this.onPointerUp);
    domElement.addEventListener('pointercancel', this.onPointerCancel);
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointercancel', this.onPointerCancel);
  }

  private cancelPendingClick(): void {
    this.pendingHitId = undefined;
    this.activePointerId = null;
    this.dragStarted = false;
    this.dragMode = null;
  }

  private resetPointerState(): void {
    this.activePointerId = null;
    this.activeButton = -1;
    this.dragStarted = false;
    this.dragMode = null;
    this.pendingHitId = undefined;
    this.gizmoConsumedPointer = false;
    this.patchLengthDragging = false;
  }
}
