import type { Rgb } from '@/colors/rgb';
import { TINT_NEUTRAL, type AssetMaterialSlots } from './material-types';

/** Default pages tint — matches Print Matt paper preset base. */
export const DEFAULT_BOOK_PAGES_TINT: Rgb = { r: 0.96, g: 0.95, b: 0.92 };

export const DEFAULT_BOOK_COVER_TINT: Rgb = TINT_NEUTRAL;

export type BookMaterialTintPart = 'pages' | 'cover';

export function bookPagesTint(slots?: AssetMaterialSlots): Rgb {
  return slots?.bookPagesTint ?? DEFAULT_BOOK_PAGES_TINT;
}

export function bookCoverTint(slots?: AssetMaterialSlots): Rgb {
  return slots?.bookCoverTint ?? DEFAULT_BOOK_COVER_TINT;
}

export function bookMaterialTint(
  slots: AssetMaterialSlots | undefined,
  part: BookMaterialTintPart,
): Rgb {
  return part === 'pages' ? bookPagesTint(slots) : bookCoverTint(slots);
}

export function cloneRgb(tint: Rgb): Rgb {
  return { r: tint.r, g: tint.g, b: tint.b };
}
