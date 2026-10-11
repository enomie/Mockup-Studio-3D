import { describe, expect, it } from 'vitest';
import {
  formatLengthMeters,
  formatMmAsMeters,
  LENGTH_DECIMALS,
  MM_TO_M,
  mmToM,
  mToMm,
  parseLengthMetersInput,
  parseMmFromMetersInput,
} from './length';

describe('length units', () => {
  it('uses four decimal places by default', () => {
    expect(LENGTH_DECIMALS).toBe(4);
    expect(formatLengthMeters(0.12345)).toBe('0.1235');
  });

  it('parses up to four decimal places', () => {
    expect(parseLengthMetersInput('0.1234')).toBe(0.1234);
    expect(parseLengthMetersInput('0.12345')).toBeNull();
  });

  it('converts mm and m', () => {
    expect(MM_TO_M).toBe(0.001);
    expect(mmToM(1000)).toBe(1);
    expect(mToMm(1)).toBe(1000);
  });

  it('formats and parses mm via meter helpers', () => {
    expect(formatMmAsMeters(36.5)).toBe('0.0365');
    expect(parseMmFromMetersInput('0.0365')).toBe(36.5);
  });
});
