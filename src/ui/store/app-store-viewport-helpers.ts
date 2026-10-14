import type { ViewportHelpersState } from '@/scene/scene-api';
import * as store from './app-store-internals';

export function isAnyViewportHelperEnabled(state: ViewportHelpersState): boolean {
  return (
    state.floorGrid ||
    state.worldOrigin ||
    state.forwardArrow ||
    state.lightHandles
  );
}

export function setViewportHelpersAllEnabled(enabled: boolean): void {
  store.patchViewportHelpers({
    floorGrid: enabled,
    worldOrigin: enabled,
    forwardArrow: enabled,
    lightHandles: enabled,
  });
}

export function toggleViewportHelpersAll(): void {
  const current = store.state.viewportHelpers;
  setViewportHelpersAllEnabled(!isAnyViewportHelperEnabled(current));
}

export function setViewportHelperFloorGrid(floorGrid: boolean): void {
  store.patchViewportHelpers({ floorGrid });
}

export function setViewportHelperWorldOrigin(worldOrigin: boolean): void {
  store.patchViewportHelpers({ worldOrigin });
}

export function setViewportHelperForwardArrow(forwardArrow: boolean): void {
  store.patchViewportHelpers({ forwardArrow });
}

export function setViewportHelperLightHandles(lightHandles: boolean): void {
  store.patchViewportHelpers({ lightHandles });
}

export function getViewportHelpersFromState(): ViewportHelpersState {
  return { ...store.state.viewportHelpers };
}
