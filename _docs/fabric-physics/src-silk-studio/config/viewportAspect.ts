export type ViewportAspectPresetId =
  | '1:1'
  | '16:9'
  | '9:16'
  | '4:3'
  | '3:4'
  | '4:5'
  | '5:4';

export interface ViewportAspectPreset {
  id: ViewportAspectPresetId;
  label: string;
  width: number;
  height: number;
}

export const VIEWPORT_ASPECT_PRESETS: readonly ViewportAspectPreset[] = [
  { id: '1:1', label: '1:1 (square)', width: 1, height: 1 },
  { id: '16:9', label: '16:9', width: 16, height: 9 },
  { id: '9:16', label: '9:16', width: 9, height: 16 },
  { id: '4:3', label: '4:3', width: 4, height: 3 },
  { id: '3:4', label: '3:4', width: 3, height: 4 },
  { id: '4:5', label: '4:5', width: 4, height: 5 },
  { id: '5:4', label: '5:4', width: 5, height: 4 },
];

export const DEFAULT_VIEWPORT_ASPECT_PRESET: ViewportAspectPresetId = '1:1';

const FALLBACK_PRESET: ViewportAspectPreset = {
  id: '1:1',
  label: '1:1 (square)',
  width: 1,
  height: 1,
};

export function viewportAspectRatio(preset: ViewportAspectPreset): number {
  return preset.width / preset.height;
}

export function getViewportAspectPreset(id: ViewportAspectPresetId): ViewportAspectPreset {
  const found = VIEWPORT_ASPECT_PRESETS.find((p) => p.id === id);
  return found ?? FALLBACK_PRESET;
}

/** Largest size with given aspect ratio that fits inside bounds (contain). */
export function containSize(
  boundsWidth: number,
  boundsHeight: number,
  aspect: number,
): { width: number; height: number } {
  if (boundsWidth <= 0 || boundsHeight <= 0 || aspect <= 0) {
    return { width: 0, height: 0 };
  }
  const boundsAspect = boundsWidth / boundsHeight;
  if (boundsAspect > aspect) {
    const height = boundsHeight;
    return { width: height * aspect, height };
  }
  const width = boundsWidth;
  return { width, height: width / aspect };
}
