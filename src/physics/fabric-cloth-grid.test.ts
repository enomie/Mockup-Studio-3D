import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FABRIC_CLOTH_SIM_QUALITY,
  fabricClothGridSegments,
} from './fabric-cloth-grid';
import { FABRIC_CLOTH_SIM_MAX_SEGMENTS_PER_AXIS } from './constants';

describe('fabricClothGridSegments', () => {
  it('uses high quality by default on 0.45 m square', () => {
    const a = fabricClothGridSegments(0.45, 0.45);
    const b = fabricClothGridSegments(0.45, 0.45, DEFAULT_FABRIC_CLOTH_SIM_QUALITY);
    expect(a).toEqual(b);
    expect(DEFAULT_FABRIC_CLOTH_SIM_QUALITY).toBe('high');
    expect(a.segmentsW).toBe(36);
    expect(a.segmentsH).toBe(36);
  });

  it('draft has fewer segments than standard than high on same panel', () => {
    const draft = fabricClothGridSegments(0.45, 0.3, 'draft');
    const standard = fabricClothGridSegments(0.45, 0.3, 'standard');
    const high = fabricClothGridSegments(0.45, 0.3, 'high');
    expect(draft.segmentsW).toBeLessThan(standard.segmentsW);
    expect(standard.segmentsW).toBeLessThan(high.segmentsW);
    expect(draft.segmentsH).toBeLessThan(standard.segmentsH);
    expect(standard.segmentsH).toBeLessThan(high.segmentsH);
  });

  it('clamps to max segments per axis', () => {
    const huge = fabricClothGridSegments(10, 10, 'high');
    expect(huge.segmentsW).toBe(FABRIC_CLOTH_SIM_MAX_SEGMENTS_PER_AXIS);
    expect(huge.segmentsH).toBe(FABRIC_CLOTH_SIM_MAX_SEGMENTS_PER_AXIS);
  });

  it('uses minimum segments for non-positive extent', () => {
    const seg = fabricClothGridSegments(0, -1, 'standard');
    expect(seg.segmentsW).toBe(2);
    expect(seg.segmentsH).toBe(2);
  });
});
