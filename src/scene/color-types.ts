import type { Rgb } from '@/colors/rgb';

export type ColorSource = 'builtin' | 'user';

export type ColorPreset = {
  id: string;
  name: string;
  source: ColorSource;
  rgb: Rgb;
};
