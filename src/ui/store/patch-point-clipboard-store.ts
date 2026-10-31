import { useSyncExternalStore } from 'react';
import { defaultPatchParamsForKind, isPatchAssetKind, replacePatchPoint } from '@/scene/asset-triangle-patch';
import {
  copyPatchPoint,
  pastePatchPoint,
  type PatchPointClipboard,
  type PatchPointPasteMode,
} from '@/scene/triangle-patch-point-clipboard';
import { setKindParams } from './app-store-asset-params';
import { getAppState } from './app-store-internals';

/** App-internal clipboard for one copied patch point (not the system clipboard). */
let current: PatchPointClipboard | null = null;
let pasteMode: PatchPointPasteMode = 'all';
const listeners = new Set<() => void>();

export function getPatchPointClipboard(): PatchPointClipboard | null {
  return current;
}

export function setPatchPointClipboard(next: PatchPointClipboard | null): void {
  current = next;
  for (const listener of listeners) {listener();}
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function usePatchPointClipboard(): PatchPointClipboard | null {
  return useSyncExternalStore(subscribe, getPatchPointClipboard);
}

function findPatchPoint(entityId: string, pointId: string) {
  const entity = getAppState().entities.find((e) => e.id === entityId);
  if (!entity || !isPatchAssetKind(entity.assetKind)) {return null;}
  const params = entity.patchParams ?? defaultPatchParamsForKind(entity.assetKind);
  const point = params.points.find((p) => p.id === pointId);
  return point ? { entity, params, point } : null;
}

/** Copies a patch point into the clipboard; returns false when it does not exist. */
export function copyPatchPointToClipboard(entityId: string, pointId: string): boolean {
  const found = findPatchPoint(entityId, pointId);
  if (!found) {return false;}
  setPatchPointClipboard(copyPatchPoint(found.point, found.entity.transform, {
    entityId,
    label: `${found.entity.name} · ${found.point.name}`,
  }));
  return true;
}

/** Pastes the clipboard onto a patch point (one undo step); returns false when nothing happened. */
export function pastePatchPointFromClipboard(
  entityId: string,
  pointId: string,
  mode: PatchPointPasteMode = pasteMode,
): boolean {
  const clip = current;
  const found = findPatchPoint(entityId, pointId);
  if (!clip || !found) {return false;}
  const next = pastePatchPoint(found.point, found.entity.transform, clip, mode);
  setKindParams('patch', entityId, { points: replacePatchPoint(found.params.points, next) });
  return true;
}


export function getPatchPointPasteMode(): PatchPointPasteMode {
  return pasteMode;
}

export function setPatchPointPasteMode(mode: PatchPointPasteMode): void {
  pasteMode = mode;
  for (const listener of listeners) {listener();}
}

export function usePatchPointPasteMode(): PatchPointPasteMode {
  return useSyncExternalStore(subscribe, getPatchPointPasteMode);
}
