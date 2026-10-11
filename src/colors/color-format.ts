import { rgbToColor, type Rgb } from './rgb';

export type Hsv = { h: number; s: number; v: number };

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function rgbToByte(rgb: Rgb): { r: number; g: number; b: number } {
  const c = rgbToColor(rgb);
  return {
    r: clampByte(c.r * 255),
    g: clampByte(c.g * 255),
    b: clampByte(c.b * 255),
  };
}

export function rgbFromByte(r: number, g: number, b: number): Rgb {
  return rgbToColor({
    r: r / 255,
    g: g / 255,
    b: b / 255,
  });
}

export function rgbToCss(rgb: Rgb): string {
  const { r, g, b } = rgbToByte(rgb);
  return `rgb(${r}, ${g}, ${b})`;
}

export function rgbToHex(rgb: Rgb): string {
  const { r, g, b } = rgbToByte(rgb);
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function normalizeHexInput(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('#')) return trimmed.toUpperCase();
  return `#${trimmed.toUpperCase()}`;
}

export function parseHexColor(input: string): Rgb | null {
  const normalized = normalizeHexInput(input);
  if (!HEX_PATTERN.test(normalized)) return null;

  const hex = normalized.slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return rgbFromByte(r, g, b);
}

export function rgbToHsv(rgb: Rgb): Hsv {
  const { r, g, b } = rgbToByte(rgb);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
}

export function hsvToRgb(hsv: Hsv): Rgb {
  const h = ((hsv.h % 360) + 360) % 360;
  const s = Math.max(0, Math.min(1, hsv.s));
  const v = Math.max(0, Math.min(1, hsv.v));

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (h < 60) {
    rn = c;
    gn = x;
  } else if (h < 120) {
    rn = x;
    gn = c;
  } else if (h < 180) {
    gn = c;
    bn = x;
  } else if (h < 240) {
    gn = x;
    bn = c;
  } else if (h < 300) {
    rn = x;
    bn = c;
  } else {
    rn = c;
    bn = x;
  }

  return rgbFromByte((rn + m) * 255, (gn + m) * 255, (bn + m) * 255);
}

export function hueToRgb(h: number): Rgb {
  return hsvToRgb({ h, s: 1, v: 1 });
}
