import { describe, expect, it } from 'vitest';
import { fabricClothGridSegments } from './fabric-cloth-grid';
import { FABRIC_CLOTH_SIM_MAX_SEGMENTS_PER_AXIS } from './constants';

describe('fabricClothGridSegments', () => {
  it('uses fixed cell size on 0.45 m square (~36 segments)', () => {
    const seg = fabricClothGridSegments(0.45, 0.45);
    expect(seg.segmentsW).toBe(36);
    expect(seg.segmentsH).toBe(36);
  });

  it('clamps to max segments per axis', () => {
    const huge = fabricClothGridSegments(10, 10);
    expect(huge.segmentsW).toBe(FABRIC_CLOTH_SIM_MAX_SEGMENTS_PER_AXIS);
    expect(huge.segmentsH).toBe(FABRIC_CLOTH_SIM_MAX_SEGMENTS_PER_AXIS);
  });

  it('uses minimum segments for non-positive extent', () => {
    const seg = fabricClothGridSegments(0, -1);
    expect(seg.segmentsW).toBe(2);
    expect(seg.segmentsH).toBe(2);
  });
});
