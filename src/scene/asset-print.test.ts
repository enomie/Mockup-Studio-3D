import { describe, expect, it } from 'vitest';
import {
  defaultPrintParams,
  printCornerRadiusM,
} from './asset-print';

describe('asset-print', () => {
  it('defaults corner radius to 0.5 mm (0.0005 m)', () => {
    expect(defaultPrintParams()).toEqual({ cornerRadiusMm: 0.5 });
  });

  it('clamps corner radius to half the smaller face edge', () => {
    const radius = printCornerRadiusM(
      { cornerRadiusMm: 500 },
      0.6,
      0.4,
      1,
    );
    expect(radius).toBeCloseTo(0.1999, 4);
  });
});
