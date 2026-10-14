import type { Material } from 'three/webgpu';
import type { BookLayoutPart } from '@/engine/book-layout';

/** Three.js BoxGeometry face order: +X, −X, +Y, −Y, +Z, −Z */
export const BOOK_BOX_FACE_COUNT = 6;

export type BookCoverPartRole = Extract<
  BookLayoutPart['role'],
  'bookFrontCover' | 'bookBackCover' | 'bookSpine'
>;

/** Outer broad-face index for each cover box part. */
export function bookCoverOuterFaceIndex(role: BookCoverPartRole): number {
  switch (role) {
    case 'bookFrontCover':
      return 4;
    case 'bookBackCover':
      return 5;
    case 'bookSpine':
      return 1;
    default:
      return 0;
  }
}

export function buildBookBoxMaterials(
  outerFaceIndex: number,
  outerMaterial: Material,
  solidMaterial: Material,
): Material[] {
  const materials: Material[] = [];
  for (let i = 0; i < BOOK_BOX_FACE_COUNT; i++) {
    materials.push(i === outerFaceIndex ? outerMaterial : solidMaterial);
  }
  return materials;
}
