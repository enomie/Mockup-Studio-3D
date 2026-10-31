import { useEffect } from 'react';
import { getAppState } from '@/ui/store/app-store-internals';
import {
  copyPatchPointToClipboard,
  pastePatchPointFromClipboard,
} from '@/ui/store/patch-point-clipboard-store';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {return false;}
  if (target.isContentEditable) {return true;}
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

/** Ctrl/Cmd+C and Ctrl/Cmd+V copy and paste the patch point picked in the viewport. */
export function usePatchPointClipboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) {return;}
      if (isEditableTarget(event.target)) {return;}
      const state = getAppState();
      const selection = state.patchHandleSelection;
      if (!selection) {return;}
      if (selection.entityId !== state.selectedEntityId) {return;}

      const key = event.key.toLowerCase();
      let handled = false;
      if (key === 'c') {handled = copyPatchPointToClipboard(selection.entityId, selection.pointId);}
      if (key === 'v') {handled = pastePatchPointFromClipboard(selection.entityId, selection.pointId);}
      if (handled) {event.preventDefault();}
    };

    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); };
  }, []);
}
