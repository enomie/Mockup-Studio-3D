import { createNoise2D } from 'simplex-noise';
import {
  CanvasTexture,
  NoColorSpace,
  RepeatWrapping,
  type Texture,
} from 'three';

const WEAVE_SIZE = 256;
const FREQ = 0.55;

export function createWeaveNormalTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = WEAVE_SIZE;
  canvas.height = WEAVE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create 2d context for weave normal map');
  }

  const imgData = ctx.createImageData(WEAVE_SIZE, WEAVE_SIZE);
  const data = imgData.data;
  const noise2d = createNoise2D();

  for (let y = 0; y < WEAVE_SIZE; y++) {
    for (let x = 0; x < WEAVE_SIZE; x++) {
      const idx = (y * WEAVE_SIZE + x) * 4;
      const u = x * FREQ * 0.1;
      const v = y * FREQ * 0.1;

      const warp = noise2d(u, v);
      const weft = noise2d(u + 10, v + 10);
      const diagonal = noise2d((u + v) * 0.7, (u - v) * 0.7);

      const nx = warp * 0.35 + diagonal * 0.2;
      const ny = weft * 0.35 - diagonal * 0.2;
      const nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;

      data[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(48, 48);
  texture.colorSpace = NoColorSpace;
  return texture;
}
