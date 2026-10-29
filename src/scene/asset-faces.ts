import type { AssetKind } from './asset-kind';
import type { Rgb } from '@/colors/rgb';

export type AssetFaceId = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export type AssetFaceContent =
  | { mode: 'color'; color: Rgb }
  | { mode: 'image'; imageId: string | null };

export type AssetFaces = Record<AssetFaceId, AssetFaceContent>;

export const NEAR_WHITE_SIDE_COLOR: Rgb = { r: 0.98, g: 0.98, b: 0.98 };

export function isPrintAssetKind(kind: AssetKind): boolean {
  return kind === 'print';
}

export function isPictureAssetKind(kind: AssetKind): boolean {
  return kind === 'picture';
}

function sideColor(): AssetFaceContent {
  return {
    mode: 'color',
    color: { ...NEAR_WHITE_SIDE_COLOR },
  };
}

function defaultPrintFaces(): AssetFaces {
  return {
    front: { mode: 'image', imageId: null },
    back: sideColor(),
    left: sideColor(),
    right: sideColor(),
    top: sideColor(),
    bottom: sideColor(),
  };
}

export function defaultFacesForKind(kind: AssetKind): AssetFaces | undefined {
  if (kind === 'print') {return defaultPrintFaces();}
  return undefined;
}

export function cloneFaceContent(content: AssetFaceContent): AssetFaceContent {
  if (content.mode === 'color') {
    return { mode: 'color', color: { ...content.color } };
  }
  return { mode: 'image', imageId: content.imageId };
}

export function cloneAssetFaces(faces: AssetFaces): AssetFaces {
  return {
    front: cloneFaceContent(faces.front),
    back: cloneFaceContent(faces.back),
    left: cloneFaceContent(faces.left),
    right: cloneFaceContent(faces.right),
    top: cloneFaceContent(faces.top),
    bottom: cloneFaceContent(faces.bottom),
  };
}

export function faceLabel(faceId: AssetFaceId): string {
  switch (faceId) {
    case 'front':
      return 'Front';
    case 'back':
      return 'Back';
    case 'left':
      return 'Left';
    case 'right':
      return 'Right';
    case 'top':
      return 'Top';
    case 'bottom':
      return 'Bottom';
  }
}
