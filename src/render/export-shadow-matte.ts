import type { RenderTarget, WebGPURenderer } from 'three/webgpu';
import {
  EXPORT_SHADOW_CATCHER_DELTA_MIN,
  EXPORT_SHADOW_CATCHER_LUMINANCE_SCALE,
} from '@/constants';

const LUM_R = 0.2126;
const LUM_G = 0.7152;
const LUM_B = 0.0722;

export function linearLuminance(r: number, g: number, b: number): number {
  return LUM_R * r + LUM_G * g + LUM_B * b;
}

function linearToSrgbByte(channel: number): number {
  const c = Math.max(0, Math.min(1, channel));
  const srgb = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, srgb)) * 255);
}

/** IEEE 754 half → float32 (WebGPU RGBA16F readback). */
function float16ToNumber(bits: number): number {
  const sign = (bits & 0x8000) >> 15;
  const exponent = (bits & 0x7c00) >> 10;
  const fraction = bits & 0x03ff;

  if (exponent === 0) {
    if (fraction === 0) return sign ? -0 : 0;
    return (sign ? -1 : 1) * Math.pow(2, -14) * (fraction / 0x400);
  }
  if (exponent === 0x1f) {
    return fraction !== 0 ? Number.NaN : sign ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  }

  return (sign ? -1 : 1) * Math.pow(2, exponent - 15) * (1 + fraction / 0x400);
}

/** RGBA16F render-target readback (row padding from WebGPU copy). */
export function unpackCompositeRgbaLinear(
  buffer: ArrayBuffer,
  width: number,
  height: number,
): Float32Array {
  const view = new Uint16Array(buffer);
  const out = new Float32Array(width * height * 4);
  const rowUint16s = (Math.ceil((width * 8) / 256) * 256) / 2;

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowUint16s;
    const outRow = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const i = rowStart + x * 4;
      const o = outRow + x * 4;
      out[o] = float16ToNumber(view[i]);
      out[o + 1] = float16ToNumber(view[i + 1]);
      out[o + 2] = float16ToNumber(view[i + 2]);
      out[o + 3] = float16ToNumber(view[i + 3]);
    }
  }

  return out;
}

export async function readCompositeRgbaLinear(
  renderer: WebGPURenderer,
  target: RenderTarget,
): Promise<{ samples: Float32Array; width: number; height: number }> {
  const width = target.width;
  const height = target.height;
  const typed = await renderer.readRenderTargetPixelsAsync(target, 0, 0, width, height);
  const bytes =
    typed instanceof ArrayBuffer
      ? new Uint8Array(typed)
      : new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  const buffer = new Uint8Array(bytes).buffer;
  const samples = unpackCompositeRgbaLinear(buffer, width, height);
  return { samples, width, height };
}

function smoothShadowAlpha(delta: number, scale: number, deltaMin: number): number {
  if (delta <= deltaMin) return 0;
  const t = Math.min(1, (delta - deltaMin) / 0.08);
  return Math.min(1, delta * scale * t);
}

export function buildContactShadowRgba8(
  beautyRgba8: Uint8ClampedArray,
  shadowsOn: Float32Array,
  shadowsOff: Float32Array,
  groundMask: Uint8Array,
  width: number,
  height: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  const scale = EXPORT_SHADOW_CATCHER_LUMINANCE_SCALE;
  const deltaMin = EXPORT_SHADOW_CATCHER_DELTA_MIN;

  for (let i = 0; i < width * height; i += 1) {
    const j = i * 4;
    const o = j;

    if (beautyRgba8[o + 3] < 4) {
      out[o + 3] = 0;
      continue;
    }

    if (groundMask[i] === 0) {
      out[o] = beautyRgba8[o];
      out[o + 1] = beautyRgba8[o + 1];
      out[o + 2] = beautyRgba8[o + 2];
      out[o + 3] = beautyRgba8[o + 3];
      continue;
    }

    const lumOff = linearLuminance(shadowsOff[j], shadowsOff[j + 1], shadowsOff[j + 2]);
    const lumOn = linearLuminance(shadowsOn[j], shadowsOn[j + 1], shadowsOn[j + 2]);
    const delta = Math.max(0, lumOff - lumOn);
    const alphaLinear = smoothShadowAlpha(delta, scale, deltaMin);

    if (alphaLinear > 0) {
      out[o] = 0;
      out[o + 1] = 0;
      out[o + 2] = 0;
      out[o + 3] = linearToSrgbByte(alphaLinear);
    } else {
      out[o + 3] = 0;
    }
  }

  return out;
}

/** Tone-mapped viewport colors (same chain as normal PNG export). */
export async function readCanvasRgba8(renderer: WebGPURenderer): Promise<Uint8ClampedArray> {
  const canvas = renderer.domElement;
  const bitmap = await createImageBitmap(canvas);
  const width = bitmap.width;
  const height = bitmap.height;
  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D context for canvas readback.');
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, width, height).data;
}

export async function rgba8ToPngBlob(rgba: Uint8ClampedArray, width: number, height: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D context for PNG export.');
  }
  const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
  ctx.putImageData(imageData, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}
