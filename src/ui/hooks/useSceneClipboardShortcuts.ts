import { useEffect } from 'react';
import { getAppState } from '@/ui/store/app-store-internals';
import {
  copySelection,
  cutSelection,
  duplicateSelection,
  pasteClipboard,
} from '@/ui/store/scene-clipboard-store';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {return false;}
  if (target.isContentEditable) {return true;}
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

/**
 * Scene asset clipboard: Ctrl/Cmd+C copy, +X cut, +V paste shifted, +Shift+V paste in place,
 * +D duplicate. Inactive while the 2D profile editor is open or a patch point is picked
 * (the patch point clipboard owns C/V then).
 */
export function useSceneClipboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) {return;}
      if (isEditableTarget(event.target)) {return;}
      const state = getAppState();
      if (state.editingProfileId) {return;}
      const key = event.key.toLowerCase();
      const patchPointPicked =
        state.patchHandleSelection !== null &&
        state.patchHandleSelection.entityId === state.selectedEntityId;
      if (patchPointPicked && !event.shiftKey && (key === 'c' || key === 'v')) {return;}

      let handled = false;
      if (key === 'c' && !event.shiftKey) {handled = copySelection();}
      else if (key === 'x' && !event.shiftKey) {handled = cutSelection();}
      else if (key === 'v') {handled = pasteClipboard({ inPlace: event.shiftKey });}
      else if (key === 'd' && !event.shiftKey) {
        // Always keep the browser's bookmark dialog away while the scene has focus.
        event.preventDefault();
        handled = duplicateSelection();
      }
      if (handled) {event.preventDefault();}
    };

    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); };
  }, []);
}
