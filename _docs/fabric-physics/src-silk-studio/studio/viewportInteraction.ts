import type { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { StudioLayerId } from '../config/studioLayers.ts';
import { pickLayerFromPointer, type LayerPickInput } from './layerSelection.ts';

export type ViewportPointerOutcome = 'gizmo' | 'selection' | 'deselect' | 'ignored';

export interface ViewportPointerStore {
  selectLayer: (id: StudioLayerId) => void;
  setActiveCorner: (index: number) => void;
  clearSelection: () => void;
}

export interface ViewportPointerInput extends LayerPickInput {
  transformControls: TransformControls;
  store: ViewportPointerStore;
}

/**
 * Handles viewport pointer-down for layer selection. Runs after TransformControls
 * has processed the same event (axis / drag are already set when applicable).
 */
export function handleViewportPointerDown(input: ViewportPointerInput): ViewportPointerOutcome {
  if (input.event.button !== 0) {
    return 'ignored';
  }

  const { transformControls } = input;
  if (transformControls.axis !== null || transformControls.dragging) {
    return 'gizmo';
  }

  const pick = pickLayerFromPointer(input);
  if (pick) {
    if (pick.layer === 'silkCorners' && pick.cornerIndex !== undefined) {
      input.store.setActiveCorner(pick.cornerIndex);
    } else {
      input.store.selectLayer(pick.layer);
    }
    return 'selection';
  }

  input.store.clearSelection();
  return 'deselect';
}
