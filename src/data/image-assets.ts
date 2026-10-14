import { BUILTIN_IMAGES } from './builtin-images.generated';

export type ImageOrientation = 'landscape' | 'portrait' | 'square';

export interface ImageAsset {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  orientation: ImageOrientation;
  source: 'starter' | 'user';
  objectUrl?: string;
  mimeType?: string;
  createdAt?: string;
  /** Parsed from builtin filename (`name--format--pixelsize`). */
  logicalName?: string;
  logicalFormat?: string;
  sizeToken?: string;
}

/** Built-in sample images from public/images — generated at build time. */
export const STARTER_IMAGES: ImageAsset[] = BUILTIN_IMAGES;

export function orientationLabel(orientation: ImageOrientation): string {
  switch (orientation) {
    case 'landscape':
      return 'Landscape';
    case 'portrait':
      return 'Portrait';
    case 'square':
      return 'Square';
  }
}

export function detectOrientation(width: number, height: number): ImageOrientation {
  if (width === height) {return 'square';}
  return width > height ? 'landscape' : 'portrait';
}
