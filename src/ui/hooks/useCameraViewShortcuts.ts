import { useEffect } from 'react';
import { CAMERA_ACTION_BY_KEY } from '@/data/camera-views';
import { getAppState, loadBuiltinView, loadSlot } from '@/ui/store/app-store';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function useCameraViewShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      if (isEditableTarget(event.target)) return;

      const action = CAMERA_ACTION_BY_KEY[event.key];
      if (!action) return;

      if (action.type === 'builtin') {
        event.preventDefault();
        loadBuiltinView(action.id);
        return;
      }

      const slot = getAppState().camera.slots[action.index - 1];
      if (!slot) return;

      event.preventDefault();
      loadSlot(action.index);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
