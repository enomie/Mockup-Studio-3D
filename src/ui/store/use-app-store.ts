import { useSyncExternalStore } from 'react';
import { getAppState, subscribe, type AppState } from './app-store';

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getAppState()),
    () => selector(getAppState()),
  );
}
