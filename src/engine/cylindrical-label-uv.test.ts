import { describe, expect, it } from 'vitest';
import { cylindricalLabelUv } from './cylindrical-label-uv';

describe('cylindricalLabelUv', () => {
  const y0 = 0.01;
  const y1 = 0.11;
  const yMid = (y0 + y1) * 0.5;

  it('maps +Z front to U=0.5', () => {
    const [u] = cylindricalLabelUv(0, yMid, 1, y0, y1);
    expect(u).toBeCloseTo(0.5, 5);
  });

  it('maps −Z back to seam U≈1', () => {
    const [u] = cylindricalLabelUv(0, yMid, -1, y0, y1);
    expect(u).toBeCloseTo(1, 5);
  });
});
