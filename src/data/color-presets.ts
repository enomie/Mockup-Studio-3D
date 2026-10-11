import type { ColorPreset } from '@/scene/color-types';

export const COLOR_NEARWHITE_ID = 'color-nearwhite';
export const COLOR_GOLD_ID = 'color-gold';
export const COLOR_ALUMINUM_ID = 'color-aluminum';
export const COLOR_ALMOST_BLACK_ID = 'color-almost-black';
export const COLOR_BLUE_ID = 'color-blue';
export const COLOR_TURQUOISE_ID = 'color-turquoise';

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: COLOR_NEARWHITE_ID,
    name: 'Nearwhite',
    source: 'builtin',
    rgb: { r: 239 / 255, g: 239 / 255, b: 239 / 255 },
  },
  {
    id: COLOR_GOLD_ID,
    name: 'Gold',
    source: 'builtin',
    rgb: { r: 1, g: 0.77, b: 0.33 },
  },
  {
    id: COLOR_ALUMINUM_ID,
    name: 'Aluminum',
    source: 'builtin',
    rgb: { r: 0.91, g: 0.92, b: 0.93 },
  },
  {
    id: COLOR_ALMOST_BLACK_ID,
    name: 'Almost Black',
    source: 'builtin',
    rgb: { r: 0.13, g: 0.13, b: 0.14 },
  },
  {
    id: COLOR_BLUE_ID,
    name: 'Blue',
    source: 'builtin',
    rgb: { r: 46 / 255, g: 135 / 255, b: 200 / 255 },
  },
  {
    id: COLOR_TURQUOISE_ID,
    name: 'Türkis',
    source: 'builtin',
    rgb: { r: 34 / 255, g: 175 / 255, b: 193 / 255 },
  },
];

export function cloneColorPreset(preset: ColorPreset): ColorPreset {
  return {
    ...preset,
    rgb: { ...preset.rgb },
  };
}

export function resolveBuiltinColorPreset(colorId: string): ColorPreset | null {
  const preset = COLOR_PRESETS.find((entry) => entry.id === colorId);
  return preset ? cloneColorPreset(preset) : null;
}
