import { useEffect } from 'react';
import { redoSceneChange, undoSceneChange } from '@/ui/store/app-store';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {return false;}
  if (target.isContentEditable) {return true;}
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

/** Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z and Ctrl+Y redo. Text fields keep their own undo. */
export function useUndoRedoShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) {return;}
      if (isEditableTarget(event.target)) {return;}
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undoSceneChange();
      } else if ((key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey)) {
        event.preventDefault();
        redoSceneChange();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); };
  }, []);
}
