import { describe, expect, it } from 'vitest';
import { defaultBookParams, resolveBookParams } from '@/scene/asset-book';

describe('resolveBookParams', () => {
  it('fills zero thickness with kind defaults', () => {
    const resolved = resolveBookParams('book-softcover', {
      coverThicknessM: 0,
      spineThicknessM: 0,
    });
    const defaults = defaultBookParams('book-softcover');
    expect(resolved.coverThicknessM).toBe(defaults.coverThicknessM);
    expect(resolved.spineThicknessM).toBe(defaults.spineThicknessM);
  });
});
