import { useSyncExternalStore } from 'react';
import type { AssetEntity } from '@/scene/entity-types';
import * as store from './app-store-internals';
import { setMode } from './app-store-lighting-live';

/** Shift per paste on the ground plane (m); repeated pastes step further. */
export const PASTE_OFFSET_M = 0.1;

/**
 * App-internal clipboard for 3D scene assets (not the system clipboard, not shared with the
 * 2D profile editor). Survives arrangement switches; not persisted.
 */
let entries: readonly AssetEntity[] = [];
let pasteCount = 0;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {listener();}
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getSceneClipboard(): readonly AssetEntity[] {
  return entries;
}

export function useSceneClipboardHasContent(): boolean {
  return useSyncExternalStore(subscribe, () => entries.length > 0);
}

/** Test helper: empties the clipboard. */
export function clearSceneClipboard(): void {
  entries = [];
  pasteCount = 0;
  notify();
}

function selectedIds(): readonly string[] {
  return store.sceneApi?.getSelectedEntityIds() ?? [];
}

function syncSelectionToStore(): void {
  const api = store.sceneApi;
  if (!api) {return;}
  store.setAppState({
    ...store.state,
    selectedEntityId: api.getSelectedEntityId(),
    selectedEntityIds: [...api.getSelectedEntityIds()],
  });
  store.emit();
}

/** Ctrl/Cmd+C: copies the selected assets. Returns false when nothing is selected. */
export function copySelection(): boolean {
  const api = store.sceneApi;
  const ids = selectedIds();
  if (!api || ids.length === 0) {return false;}
  entries = api.getEntitySnapshots(ids);
  pasteCount = 0;
  notify();
  return true;
}

/** Ctrl/Cmd+X: copies the selected assets and removes them right away (one undo step). */
export function cutSelection(): boolean {
  const api = store.sceneApi;
  const ids = [...selectedIds()];
  if (!api || !copySelection()) {return false;}
  // Pasting a cut puts it back where it was first (no offset on the first paste).
  pasteCount = -1;
  api.removeEntities(ids, ids.length > 1 ? `Cut ${ids.length} objects` : 'Cut object');
  syncSelectionToStore();
  return true;
}

/**
 * Ctrl/Cmd+V: pastes shifted and switches to the move tool; Ctrl/Cmd+Shift+V (`inPlace`)
 * pastes at the original position.
 */
export function pasteClipboard(options: { inPlace?: boolean } = {}): boolean {
  const api = store.sceneApi;
  if (!api || entries.length === 0) {return false;}
  let step = 0;
  if (!options.inPlace) {
    pasteCount += 1;
    step = Math.max(pasteCount, 0);
  }
  const offset = { x: step * PASTE_OFFSET_M, y: 0, z: step * PASTE_OFFSET_M };
  const label = entries.length > 1 ? `Paste ${entries.length} objects` : 'Paste object';
  api.insertEntityCopies(entries, offset, label);
  if (!options.inPlace) {setMode('translate');}
  syncSelectionToStore();
  return true;
}

/** Ctrl/Cmd+D: duplicates the selection shifted (clipboard untouched) and switches to move. */
export function duplicateSelection(): boolean {
  const api = store.sceneApi;
  const ids = selectedIds();
  if (!api || ids.length === 0) {return false;}
  const snapshots = api.getEntitySnapshots(ids);
  const offset = { x: PASTE_OFFSET_M, y: 0, z: PASTE_OFFSET_M };
  api.insertEntityCopies(snapshots, offset, ids.length > 1 ? `Duplicate ${ids.length} objects` : 'Duplicate object');
  setMode('translate');
  syncSelectionToStore();
  return true;
}
