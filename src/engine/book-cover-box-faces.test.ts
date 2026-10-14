import { describe, expect, it } from 'vitest';
import {
  bookCoverOuterFaceIndex,
  buildBookBoxMaterials,
  BOOK_BOX_FACE_COUNT,
} from '@/engine/book-cover-box-faces';

describe('bookCoverOuterFaceIndex', () => {
  it('maps cover parts to BoxGeometry outer face indices', () => {
    expect(bookCoverOuterFaceIndex('bookFrontCover')).toBe(4);
    expect(bookCoverOuterFaceIndex('bookBackCover')).toBe(5);
    expect(bookCoverOuterFaceIndex('bookSpine')).toBe(1);
  });
});

describe('buildBookBoxMaterials', () => {
  it('assigns outer material to one face only', () => {
    const outer = { name: 'outer' } as never;
    const solid = { name: 'solid' } as never;
    const mats = buildBookBoxMaterials(4, outer, solid);
    expect(mats).toHaveLength(BOOK_BOX_FACE_COUNT);
    expect(mats.filter((m) => m === outer)).toHaveLength(1);
    expect(mats[4]).toBe(outer);
    expect(mats.filter((m) => m === solid)).toHaveLength(5);
  });
});
