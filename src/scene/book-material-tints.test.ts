import { describe, expect, it } from 'vitest';
import {
  bookCoverTint,
  bookPagesTint,
  DEFAULT_BOOK_COVER_TINT,
  DEFAULT_BOOK_PAGES_TINT,
} from '@/scene/book-material-tints';

describe('book material tints', () => {
  it('uses defaults when slots omit tints', () => {
    expect(bookPagesTint(undefined)).toEqual(DEFAULT_BOOK_PAGES_TINT);
    expect(bookCoverTint(undefined)).toEqual(DEFAULT_BOOK_COVER_TINT);
  });

  it('reads custom tints from slots', () => {
    const custom = { r: 0.2, g: 0.3, b: 0.4 };
    expect(bookPagesTint({ bookPagesTint: custom }).r).toBe(0.2);
    expect(bookCoverTint({ bookCoverTint: custom }).b).toBe(0.4);
  });
});
