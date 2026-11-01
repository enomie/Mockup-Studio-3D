import type { ProfileBounds, ProfileVec2 } from '@/scene/profile-model';

/** Screen transform of the 2D editor: screen = mm * scale + offset (CSS px). */
export interface EditorView {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 200;

export function toScreen(view: EditorView, point: ProfileVec2): ProfileVec2 {
  return { x: point.x * view.scale + view.offsetX, y: point.y * view.scale + view.offsetY };
}

export function toMm(view: EditorView, point: ProfileVec2): ProfileVec2 {
  return { x: (point.x - view.offsetX) / view.scale, y: (point.y - view.offsetY) / view.scale };
}

export interface FitPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** View that shows `bounds` inside the free area of a `width` × `height` canvas. */
export function fitView(
  bounds: ProfileBounds,
  width: number,
  height: number,
  padding: FitPadding,
): EditorView {
  const freeW = Math.max(width - padding.left - padding.right, 80);
  const freeH = Math.max(height - padding.top - padding.bottom, 80);
  const spanX = Math.max(bounds.maxX - bounds.minX, 1);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.min(Math.max(Math.min(freeW / spanX, freeH / spanY), MIN_SCALE), MAX_SCALE);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const left = width - freeW - padding.right;
  return {
    scale,
    offsetX: left + freeW / 2 - centerX * scale,
    offsetY: padding.top + freeH / 2 - centerY * scale,
  };
}

/** Zoom by `factor` keeping the mm point under `anchor` (screen px) fixed. */
export function zoomAt(view: EditorView, anchor: ProfileVec2, factor: number): EditorView {
  const scale = Math.min(Math.max(view.scale * factor, MIN_SCALE), MAX_SCALE);
  const mm = toMm(view, anchor);
  return { scale, offsetX: anchor.x - mm.x * scale, offsetY: anchor.y - mm.y * scale };
}

const GRID_STEPS_MM = [0.1, 0.5, 1, 5, 10, 50, 100, 500, 1000];
const MIN_GRID_PX = 8;

/** Smallest grid step (mm) that is at least MIN_GRID_PX apart on screen. */
export function gridStepMm(scale: number): number {
  return GRID_STEPS_MM.find((step) => step * scale >= MIN_GRID_PX) ?? 1000;
}
