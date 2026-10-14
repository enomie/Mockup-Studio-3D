import { describe, expect, it } from 'vitest';
import {
  clampBlockParams,
  defaultBlockParams,
  effectiveBlockCornerRadiusM,
} from './asset-block';

describe('defaultBlockParams', () => {
  it('matches v1 defaults', () => {
    expect(defaultBlockParams()).toEqual({
      widthM: 0.3,
      heightM: 0.3,
      depthM: 0.3,
      cornerRadiusMm: 5,
    });
  });
});

describe('clampBlockParams', () => {
  it('clamps corner radius to half smallest dimension in mm', () => {
    const result = clampBlockParams(
      { widthM: 0.2, heightM: 1, depthM: 1, cornerRadiusMm: 500 },
      defaultBlockParams(),
    );
    expect(result.cornerRadiusMm).toBeCloseTo(100);
  });
});

describe('effectiveBlockCornerRadiusM', () => {
  it('converts mm to meters', () => {
    expect(effectiveBlockCornerRadiusM(defaultBlockParams())).toBeCloseTo(0.005);
  });

  it('returns 0 when corner radius is 0', () => {
    expect(
      effectiveBlockCornerRadiusM({ ...defaultBlockParams(), cornerRadiusMm: 0 }),
    ).toBe(0);
  });
});
