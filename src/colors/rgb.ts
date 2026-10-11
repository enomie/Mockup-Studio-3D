export type Rgb = { r: number; g: number; b: number };

export function rgbToColor(rgb: Rgb): Rgb {
  return {
    r: Math.max(0, Math.min(1, rgb.r)),
    g: Math.max(0, Math.min(1, rgb.g)),
    b: Math.max(0, Math.min(1, rgb.b)),
  };
}

export function multiplyRgb(base: Rgb, tint: Rgb): Rgb {
  return {
    r: base.r * tint.r,
    g: base.g * tint.g,
    b: base.b * tint.b,
  };
}
