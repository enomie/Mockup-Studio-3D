import type { AssetKind } from './asset-kind';
import { clamp } from '@/units/math';

export type WallParams = {
  widthM: number;
  heightM: number;
  thicknessM: number;
};

export type WallpaperPattern = {
  stripWidthM: number;
  stripHeightM: number;
  /** Y shift for odd columns (half-drop when = stripHeightM / 2). */
  columnOffsetM: number;
};

export const DOOR_WIDTH_M = 2;
export const DOOR_HEIGHT_M = 2.5;
export const DOOR_LEFT_INSET_M = 1;

const WALL_WIDTH_MIN = 0.5;
const WALL_WIDTH_MAX = 20;
const WALL_HEIGHT_MIN = 0.5;
const WALL_HEIGHT_MAX = 20;
const WALL_THICKNESS_MIN = 0.05;
const WALL_THICKNESS_MAX = 2;
const STRIP_MIN = 0.05;
const STRIP_MAX = 10;

export function defaultWallParams(): WallParams {
  return {
    widthM: 4,
    heightM: 4,
    thicknessM: 0.4,
  };
}

export function defaultWallpaperPattern(): WallpaperPattern {
  const stripHeightM = 2;
  return {
    stripWidthM: 0.53,
    stripHeightM,
    columnOffsetM: stripHeightM / 2,
  };
}

/** One wallpaper tile height in meters — from image aspect when pixels known (no stretch). */
export function wallpaperStripHeightM(
  stripWidthM: number,
  imageWidth?: number,
  imageHeight?: number,
  fallbackStripHeightM?: number,
): number {
  if (
    stripWidthM > 0 &&
    imageWidth !== undefined &&
    imageHeight !== undefined &&
    imageWidth > 0 &&
    imageHeight > 0
  ) {
    return stripWidthM * (imageHeight / imageWidth);
  }
  return fallbackStripHeightM ?? defaultWallpaperPattern().stripHeightM;
}

/** Apply image-driven strip height so each tile matches bitmap aspect ratio. */
export function resolveWallpaperPattern(
  pattern: Partial<WallpaperPattern> | WallpaperPattern,
  imageWidth?: number,
  imageHeight?: number,
): WallpaperPattern {
  const base = migrateWallpaperPattern(pattern);
  const stripHeightM = wallpaperStripHeightM(
    base.stripWidthM,
    imageWidth,
    imageHeight,
    base.stripHeightM,
  );
  return clampWallpaperPattern(
    { stripHeightM },
    { ...base, stripHeightM },
  );
}

export function migrateWallpaperPattern(
  pattern?: Partial<WallpaperPattern>,
): WallpaperPattern {
  const base = defaultWallpaperPattern();
  const stripHeightM = pattern?.stripHeightM ?? base.stripHeightM;
  return {
    stripWidthM: pattern?.stripWidthM ?? base.stripWidthM,
    stripHeightM,
    columnOffsetM:
      pattern?.columnOffsetM ?? stripHeightM / 2,
  };
}

export function cloneWallParams(params: WallParams): WallParams {
  return { ...params };
}

export function cloneWallpaperPattern(pattern: WallpaperPattern): WallpaperPattern {
  return { ...pattern };
}

export function isWallAssetKind(kind: AssetKind): boolean {
  return kind === 'wall' || kind === 'wall-door';
}

export function clampWallParams(partial: Partial<WallParams>, base: WallParams): WallParams {
  return {
    widthM: clamp(partial.widthM ?? base.widthM, WALL_WIDTH_MIN, WALL_WIDTH_MAX),
    heightM: clamp(partial.heightM ?? base.heightM, WALL_HEIGHT_MIN, WALL_HEIGHT_MAX),
    thicknessM: clamp(
      partial.thicknessM ?? base.thicknessM,
      WALL_THICKNESS_MIN,
      WALL_THICKNESS_MAX,
    ),
  };
}

export function clampWallpaperPattern(
  partial: Partial<WallpaperPattern>,
  base: WallpaperPattern,
): WallpaperPattern {
  const stripHeightM = clamp(
    partial.stripHeightM ?? base.stripHeightM,
    STRIP_MIN,
    STRIP_MAX,
  );
  const maxColumnOffset = stripHeightM;
  return {
    stripWidthM: clamp(partial.stripWidthM ?? base.stripWidthM, STRIP_MIN, STRIP_MAX),
    stripHeightM,
    columnOffsetM: clamp(
      partial.columnOffsetM ?? base.columnOffsetM,
      0,
      maxColumnOffset,
    ),
  };
}

/** Center X of door cutter in wall-local space (bottom pivot, X centered on wall). */
export function doorCutterCenterX(widthM: number): number {
  return -widthM / 2 + DOOR_LEFT_INSET_M + DOOR_WIDTH_M / 2;
}

