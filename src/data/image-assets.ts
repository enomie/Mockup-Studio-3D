export type ImageOrientation = 'landscape' | 'portrait' | 'square';

export type ImageAsset = {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  orientation: ImageOrientation;
  source: 'starter' | 'user';
  objectUrl?: string;
};

/** Built-in sample images in /public — provided to every user. */
export const STARTER_IMAGES: ImageAsset[] = [
  {
    id: 'sample-landscape-2560x1440',
    name: 'sample-landscape-2560x1440.png',
    url: '/sample-landscape-2560x1440.png',
    width: 2560,
    height: 1440,
    orientation: 'landscape',
    source: 'starter',
  },
  {
    id: 'sample-landscape-1439x960',
    name: 'sample-landscape-1439x960.png',
    url: '/sample-landscape-1439x960.png',
    width: 1439,
    height: 960,
    orientation: 'landscape',
    source: 'starter',
  },
  {
    id: 'sample-portrait-440x955',
    name: 'sample-portrait-440x955.png',
    url: '/sample-portrait-440x955.png',
    width: 440,
    height: 955,
    orientation: 'portrait',
    source: 'starter',
  },
  {
    id: 'sample-portrait-772x1031',
    name: 'sample-portrait-772x1031.png',
    url: '/sample-portrait-772x1031.png',
    width: 772,
    height: 1031,
    orientation: 'portrait',
    source: 'starter',
  },
  {
    id: 'label-F-blue-transparent-square',
    name: 'label-F-blue-transparent-square.png',
    url: '/label-F-blue-transparent-square.png',
    width: 2048,
    height: 2048,
    orientation: 'square',
    source: 'starter',
  },
];

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
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}
