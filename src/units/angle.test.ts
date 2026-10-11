import { describe, expect, it } from 'vitest';
import { degToRad, DEG_TO_RAD, radToDeg, RAD_TO_DEG } from './angle';

describe('angle units', () => {
  it('exposes deg/rad constants', () => {
    expect(DEG_TO_RAD).toBeCloseTo(Math.PI / 180);
    expect(RAD_TO_DEG).toBeCloseTo(180 / Math.PI);
  });

  it('converts deg and rad', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
    expect(radToDeg(Math.PI)).toBeCloseTo(180);
  });
});
