import { describe, expect, it } from 'vitest';
import { defaultBookParams } from '@/scene/asset-book';
import { computeBookLayout } from '@/engine/book-layout';

describe('computeBookLayout', () => {
  it('softcover: pages match cover footprint', () => {
    const params = defaultBookParams('book-softcover');
    const layout = computeBookLayout(0.2, 0.28, params, 'book-softcover');
    const pages = layout.parts.find((p) => p.role === 'bookPages');
    expect(pages?.sizeX).toBe(0.2);
    expect(pages?.sizeY).toBe(0.28);
    expect(layout.totalWidthM).toBe(params.spineThicknessM + 0.2);
    expect(layout.totalThicknessM).toBe(
      params.pagesThicknessM + 2 * params.coverThicknessM,
    );
  });

  it('hardcover: pages inset by overhang', () => {
    const params = { ...defaultBookParams('book-hardcover'), coverOverhangMm: 4 };
    const layout = computeBookLayout(0.2, 0.28, params, 'book-hardcover');
    const pages = layout.parts.find((p) => p.role === 'bookPages');
    expect(pages?.sizeX).toBeCloseTo(0.2 - 0.008, 6);
    expect(pages?.sizeY).toBeCloseTo(0.28 - 0.008, 6);
  });

  it('spine depth matches total thickness', () => {
    const params = defaultBookParams('book-softcover');
    const layout = computeBookLayout(0.15, 0.21, params, 'book-softcover');
    const spine = layout.parts.find((p) => p.role === 'bookSpine');
    expect(spine?.sizeZ).toBe(layout.totalThicknessM);
  });
});
