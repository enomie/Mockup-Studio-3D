import type { Rgb } from '@/colors/rgb';

type ColorSource = 'builtin' | 'user';

export interface ColorPreset {
  id: string;
  name: string;
  source: ColorSource;
  rgb: Rgb;
}
