import { useEffect } from 'react';
import { VIEWPORT_TOOL_BY_KEY } from '@/ui/shell/viewport-tools';
import { setMode } from '@/ui/store/app-store';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function useViewportToolShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      if (isEditableTarget(event.target)) return;

      const mode = VIEWPORT_TOOL_BY_KEY[event.key.toLowerCase()];
      if (!mode) return;

      event.preventDefault();
      setMode(mode);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
