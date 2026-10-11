import type { Rgb } from '@/colors/rgb';
import { rgbToHex } from '@/colors/color-format';

const MAX_RECENT = 8;
const recentHexes: string[] = [];

export function getRecentColors(): Rgb[] {
  return recentHexes.map((hex) => {
    const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
    const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
    const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  });
}

export function pushRecentColor(rgb: Rgb): void {
  const hex = rgbToHex(rgb);
  const without = recentHexes.filter((entry) => entry !== hex);
  without.unshift(hex);
  recentHexes.length = 0;
  recentHexes.push(...without.slice(0, MAX_RECENT));
}
