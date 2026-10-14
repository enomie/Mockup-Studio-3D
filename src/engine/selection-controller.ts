import { Raycaster, Vector2, type Camera, type Object3D } from 'three/webgpu';
import { noop } from '@/utils/noop';
import type { EntityRegistry } from './entity-registry';

const _pointer = new Vector2();
const _raycaster = new Raycaster();

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {return false;}
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {return true;}
  if (target.isContentEditable) {return true;}
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export class SelectionController {
  private readonly domElement: HTMLElement;
  private readonly registry: EntityRegistry;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') {
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

  setSelectHandler(handler: (entityId: string | null) => void): void {
    this.onSelect = handler;
  }

  setDeleteHandler(handler: () => void): void {
    this.onDelete = handler;
  }

  pickAt(clientX: number, clientY: number): string | null {
    const camera = this.getCamera();
    if (!camera) {return null;}

    const rect = this.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {return null;}

    _pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.setFromCamera(_pointer, camera);

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
