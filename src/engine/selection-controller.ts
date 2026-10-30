import { Raycaster, Vector2, type Camera, type Object3D, type Ray } from 'three/webgpu';
import { noop } from '@/utils/noop';
import type { EntityRegistry } from './entity-registry';
import type { ViewportPointer } from './triangle-patch-add-point-tool';

const _pointer = new Vector2();
const _raycaster = new Raycaster();

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {return false;}
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {return true;}
  if (target.isContentEditable) {return true;}
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export interface PatchLengthDragHandlers {
  begin: (ray: Ray) => boolean;
  update: (ray: Ray) => void;
  end: () => void;
}

/** The patch add-point mode, driven by pointer events on the viewport. */
export interface PatchAddPointHandlers {
  isActive: () => boolean;
  hover: (pointer: ViewportPointer, camera: Camera) => void;
  commit: (pointer: ViewportPointer, camera: Camera) => void;
  cancel: () => void;
}

export class SelectionController {
  private readonly domElement: HTMLElement;
  private readonly registry: EntityRegistry;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') {
      if (this.patchAddPoint?.isActive()) {
        this.patchAddPoint.cancel();
        return;
      }
      this.onSelect(null);
      return;
    }

    if (event.code !== 'Delete' && event.code !== 'Backspace') {return;}
    if (isEditableTarget(event.target)) {return;}

    event.preventDefault();
    this.onDelete();
  };

  private getCamera: () => Camera | null = () => null;
  private getLightPickables: () => Object3D[] = () => [];
  private getPatchPickables: () => Object3D[] = () => [];
  private onSelectPatchHandle: (mesh: Object3D) => boolean = () => false;
  private patchLengthDrag: PatchLengthDragHandlers | null = null;
  private patchAddPoint: PatchAddPointHandlers | null = null;
  private onSelect: (entityId: string | null) => void = noop;
  private onDelete: () => void = noop;

  constructor(domElement: HTMLElement, registry: EntityRegistry) {
    this.domElement = domElement;
    this.registry = registry;
    window.addEventListener('keydown', this.onKeyDown);
  }

  setCameraProvider(provider: () => Camera | null): void {
    this.getCamera = provider;
  }

  setLightPickablesProvider(provider: () => Object3D[]): void {
    this.getLightPickables = provider;
  }

  setPatchPickablesProvider(
    provider: () => Object3D[],
    selectHandler: (mesh: Object3D) => boolean,
  ): void {
    this.getPatchPickables = provider;
    this.onSelectPatchHandle = selectHandler;
  }

  setSelectHandler(handler: (entityId: string | null) => void): void {
    this.onSelect = handler;
  }

  setDeleteHandler(handler: () => void): void {
    this.onDelete = handler;
  }

  setPatchLengthDragHandlers(handlers: PatchLengthDragHandlers): void {
    this.patchLengthDrag = handlers;
  }

  /** Starts a patch lever length drag if the pointer is on the length ring. */
  beginPatchLengthDragAt(clientX: number, clientY: number): boolean {
    if (!this.patchLengthDrag || !this.setRayFromClient(clientX, clientY)) {return false;}
    return this.patchLengthDrag.begin(_raycaster.ray);
  }

  updatePatchLengthDragAt(clientX: number, clientY: number): void {
    if (!this.patchLengthDrag || !this.setRayFromClient(clientX, clientY)) {return;}
    this.patchLengthDrag.update(_raycaster.ray);
  }

  endPatchLengthDrag(): void {
    this.patchLengthDrag?.end();
  }

  setPatchAddPointHandlers(handlers: PatchAddPointHandlers): void {
    this.patchAddPoint = handlers;
  }

  isPatchAddPointActive(): boolean {
    return this.patchAddPoint?.isActive() ?? false;
  }

  hoverPatchAddPointAt(clientX: number, clientY: number): void {
    const camera = this.getCamera();
    const pointer = this.viewportPointer(clientX, clientY);
    if (!this.patchAddPoint || !camera || !pointer) {return;}
    this.patchAddPoint.hover(pointer, camera);
  }

  commitPatchAddPointAt(clientX: number, clientY: number): void {
    const camera = this.getCamera();
    const pointer = this.viewportPointer(clientX, clientY);
    if (!this.patchAddPoint || !camera || !pointer) {return;}
    this.patchAddPoint.commit(pointer, camera);
  }

  private viewportPointer(clientX: number, clientY: number): ViewportPointer | null {
    const rect = this.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {return null;}
    return {
      ndc: new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      ),
      widthPx: rect.width,
      heightPx: rect.height,
    };
  }

  private setRayFromClient(clientX: number, clientY: number): boolean {
    const camera = this.getCamera();
    if (!camera) {return false;}

    const rect = this.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {return false;}

    _pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.setFromCamera(_pointer, camera);
    return true;
  }

  pickAt(clientX: number, clientY: number): string | null {
    if (!this.setRayFromClient(clientX, clientY)) {return null;}

    const patchPickables = this.getPatchPickables();
    if (patchPickables.length > 0) {
      const patchHits = _raycaster.intersectObjects(patchPickables, false);
      if (patchHits.length > 0) {
        const handled = this.onSelectPatchHandle(patchHits[0].object);
        if (handled) {
          return '__PATCH_HANDLE_SELECTED__';
        }
      }
    }

    const assetHits = _raycaster.intersectObjects(this.collectAssetRoots(), true);
    const assetEntityId = this.findEntityId(assetHits);
    if (assetEntityId) {return assetEntityId;}

    const lightPickables = this.getLightPickables();
    if (lightPickables.length > 0) {
      const lightHits = _raycaster.intersectObjects(lightPickables, true);
      const lightEntityId = this.findEntityId(lightHits);
      if (lightEntityId) {return lightEntityId;}
    }

    return null;
  }

  selectEntity(entityId: string): void {
    this.onSelect(entityId);
  }

  deselect(): void {
    this.onSelect(null);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private collectAssetRoots(): Object3D[] {
    return this.registry
      .getEntities()
      .map((entity) => this.registry.getRuntime(entity.id)?.object)
      .filter((object): object is Object3D => Boolean(object));
  }

  private findEntityId(hits: { object: Object3D }[]): string | null {
    for (const hit of hits) {
      let current: Object3D | null = hit.object;
      while (current) {
        const entityId = current.userData.entityId as string | undefined;
        if (entityId) {return entityId;}
        current = current.parent;
      }
    }
    return null;
  }
}
