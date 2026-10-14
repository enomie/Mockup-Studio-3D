import { describe, expect, it } from 'vitest';
import {
  clampFabricClothParams,
  defaultFabricClothParams,
  FABRIC_CLOTH_BORDER_WIDTH_MAX_M,
  FABRIC_CLOTH_BORDER_WIDTH_MIN_M,
  FABRIC_CLOTH_BORDER_WIDTH_M,
  FABRIC_CLOTH_REF_WIDTH_M,
} from './asset-fabric-cloth';

describe('asset-fabric-cloth', () => {
  it('defaults to flatlay without border', () => {
    const params = defaultFabricClothParams();
    expect(params.borderEnabled).toBe(false);
    expect(params.borderColor).toMatch(/^#/);
  });

  it('merges border params', () => {
    const base = defaultFabricClothParams();
    const merged = clampFabricClothParams({ borderEnabled: true }, base);
    expect(merged.borderEnabled).toBe(true);
    expect(merged.borderColor).toBe(base.borderColor);
    expect(merged.borderWidthM).toBe(FABRIC_CLOTH_BORDER_WIDTH_M);
  });

  it('clamps border width in meters', () => {
    const base = defaultFabricClothParams();
    expect(
      clampFabricClothParams({ borderWidthM: 0 }, base).borderWidthM,
    ).toBe(FABRIC_CLOTH_BORDER_WIDTH_MIN_M);
    expect(
      clampFabricClothParams({ borderWidthM: 1 }, base).borderWidthM,
    ).toBe(FABRIC_CLOTH_BORDER_WIDTH_MAX_M);
  });

  it('exports reference sizing constants', () => {
    expect(FABRIC_CLOTH_REF_WIDTH_M).toBe(0.45);
    expect(FABRIC_CLOTH_BORDER_WIDTH_M).toBe(0.002);
  });
});
