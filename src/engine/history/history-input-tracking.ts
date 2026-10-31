import type { SceneHistoryController } from './scene-history-controller';

/**
 * Feeds window-level user input into the history: a pointer press groups everything
 * until release into one step; keys and form input mark following changes as user edits.
 */
export function attachHistoryInputTracking(history: SceneHistoryController): () => void {
  const onPointerDown = (): void => { history.setPointerDown(true); };
  const onPointerUp = (): void => { history.setPointerDown(false); };
  const onUserInput = (): void => { history.noteUserActivity(); };
  const options = { capture: true } as const;

  window.addEventListener('pointerdown', onPointerDown, options);
  window.addEventListener('pointerup', onPointerUp, options);
  window.addEventListener('pointercancel', onPointerUp, options);
  window.addEventListener('keydown', onUserInput, options);
  window.addEventListener('input', onUserInput, options);
  window.addEventListener('change', onUserInput, options);
  window.addEventListener('wheel', onUserInput, options);

  return () => {
    window.removeEventListener('pointerdown', onPointerDown, options);
    window.removeEventListener('pointerup', onPointerUp, options);
    window.removeEventListener('pointercancel', onPointerUp, options);
    window.removeEventListener('keydown', onUserInput, options);
    window.removeEventListener('input', onUserInput, options);
    window.removeEventListener('change', onUserInput, options);
    window.removeEventListener('wheel', onUserInput, options);
  };
}
