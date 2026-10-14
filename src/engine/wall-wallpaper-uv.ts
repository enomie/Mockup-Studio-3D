export interface WallpaperUvInput {
  /** Wall-local X (centered on wall width). */
  x: number;
  /** Wall-local Y from bottom. */
  y: number;
  wallWidthM: number;
  stripWidthM: number;
  stripHeightM: number;
  columnOffsetM: number;
}

export interface WallpaperUv {
  u: number;
  v: number;
}

export function positiveMod(value: number, modulus: number): number {
  if (modulus <= 0) {return 0;}
  const m = value % modulus;
  return m < 0 ? m + modulus : m;
}

/** Half-drop wallpaper UV in strip-local 0…1 space (repeat / tile, no cover). */
export function wallpaperUvFromLocal(input: WallpaperUvInput): WallpaperUv {
  const { x, y, wallWidthM, stripWidthM, stripHeightM, columnOffsetM } = input;
  if (stripWidthM <= 0 || stripHeightM <= 0) {
    return { u: 0, v: 0 };
  }

  const uAlong = x + wallWidthM / 2;
  const column = Math.floor(uAlong / stripWidthM);
  const vShift = column % 2 === 0 ? 0 : columnOffsetM;

  const u = positiveMod(uAlong, stripWidthM) / stripWidthM;
  const v = positiveMod(y - vShift, stripHeightM) / stripHeightM;

  return { u, v };
}
