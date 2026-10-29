import { describe, expect, it } from 'vitest';
import {
  clampFabricClothParams,
  cloneFabricClothParams,
  defaultFabricClothParams,
  FABRIC_CLOTH_BORDER_WIDTH_MAX_M,
  FABRIC_CLOTH_BORDER_WIDTH_MIN_M,
  FABRIC_CLOTH_BORDER_WIDTH_M,
  FABRIC_CLOTH_REF_WIDTH_M,
  isFabricRuntimeTuningPatch,
  migrateFabricClothParams,
} from './asset-fabric-cloth';

describe('asset-fabric-cloth', () => {
  it('defaults to flatlay without border', () => {
    const params = defaultFabricClothParams();
    expect(params.borderEnabled).toBe(false);
    expect(params.borderColor).toMatch(/^#/);
    expect(params.physics.activePreset).toBe('silk');
    expect(params.sim.pinnedCornersCount).toBe(0);
    expect(params.sim.pinCorners).toHaveLength(4);
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

  it('clamps pinned corner count', () => {
    const base = defaultFabricClothParams();
    expect(
      clampFabricClothParams(
        {
          sim: {
            ...base.sim,
            pinnedCornersCount: 9,
          },
        },
        base,
      ).sim.pinnedCornersCount,
    ).toBe(4);
  });

  it('migrates legacy border-only payloads', () => {
    const migrated = migrateFabricClothParams({ borderEnabled: true });
    expect(migrated.borderEnabled).toBe(true);
    expect(migrated.physics.gravityMagnitude).toBeGreaterThan(0);
    expect(migrated.sim.restPose.position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('clone deep-copies sim pins', () => {
    const base = defaultFabricClothParams({ widthM: 0.4, heightM: 0.2 });
    const copy = cloneFabricClothParams(base);
    copy.sim.pinCorners[0].x = 999;
    expect(base.sim.pinCorners[0].x).not.toBe(999);
  });

  it('isFabricRuntimeTuningPatch allows physics and sim only', () => {
    expect(isFabricRuntimeTuningPatch({ physics: defaultFabricClothParams().physics })).toBe(
      true,
    );
    expect(isFabricRuntimeTuningPatch({ sim: defaultFabricClothParams().sim })).toBe(true);
    expect(
      isFabricRuntimeTuningPatch({
        physics: defaultFabricClothParams().physics,
        sim: defaultFabricClothParams().sim,
      }),
    ).toBe(true);
    expect(isFabricRuntimeTuningPatch({ borderEnabled: true })).toBe(false);
    expect(
      isFabricRuntimeTuningPatch({
        borderEnabled: true,
        physics: defaultFabricClothParams().physics,
      }),
    ).toBe(false);
  });

  it('exports reference sizing constants', () => {
    expect(FABRIC_CLOTH_REF_WIDTH_M).toBe(0.45);
    expect(FABRIC_CLOTH_BORDER_WIDTH_M).toBe(0.002);
  });
});
