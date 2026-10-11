/**
 * Read-only helpers for entity property UI (router, transform sizing).
 * Domain defaults and params live in `asset-{kind}.ts` — not in `scene-api`.
 */
export {
  computeFaceSize,
  resolveAssetAspectRatio,
  resolveEntityImagePixels,
  sizeScaleFromFaceHeight,
  sizeScaleFromFaceWidth,
} from './asset-sizing';
