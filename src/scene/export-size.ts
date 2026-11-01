/** Aspect ratio choice in the Export panel. `viewport` = use the live viewport as-is. */
export type ExportAspectPreset = 'viewport' | '16:9' | '4:3' | '1:1' | '4:5' | 'custom';

export type ExportOrientation = 'landscape' | 'portrait';

type ExportSizeAnchor = 'width' | 'height';

export interface ExportRatio {
  w: number;
  h: number;
}

/** Export framing + pixel size (kept per app session until scenes exist). */
export interface ExportSizeSettings {
  aspectPreset: ExportAspectPreset;
  customRatio: ExportRatio;
  orientation: ExportOrientation;
  width: number;
  height: number;
  /** Side the user edited last; the other side is derived from the ratio. */
  anchor: ExportSizeAnchor;
  frameVisible: boolean;
}

export interface ExportFrameRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const EXPORT_SIZE_MIN = 16;
/** Typical WebGPU `maxTextureDimension2D`; the engine clamps to the device limit too. */
export const EXPORT_SIZE_MAX = 8192;

const PRESET_RATIOS: Readonly<Record<Exclude<ExportAspectPreset, 'viewport' | 'custom'>, ExportRatio>> = {
  '16:9': { w: 16, h: 9 },
  '4:3': { w: 4, h: 3 },
  '1:1': { w: 1, h: 1 },
  '4:5': { w: 4, h: 5 },
};

export function defaultExportSizeSettings(): ExportSizeSettings {
  return {
    aspectPreset: 'viewport',
    customRatio: { w: 21, h: 9 },
    orientation: 'landscape',
    width: 3840,
    height: 2160,
    anchor: 'width',
    frameVisible: true,
  };
}

export function isFixedExportAspect(settings: ExportSizeSettings): boolean {
  return settings.aspectPreset !== 'viewport';
}

export function isSquareExportRatio(settings: ExportSizeSettings): boolean {
  const base = baseRatio(settings);
  return base !== null && base.w === base.h;
}

function baseRatio(settings: ExportSizeSettings): ExportRatio | null {
  if (settings.aspectPreset === 'viewport') {return null;}
  if (settings.aspectPreset === 'custom') {return settings.customRatio;}
  return PRESET_RATIOS[settings.aspectPreset];
}

/** Width / height including orientation; `null` for the `viewport` preset. */
export function resolveExportAspect(settings: ExportSizeSettings): number | null {
  const base = baseRatio(settings);
  if (!base) {return null;}
  // Orientation decides which side is long: landscape = long side horizontal.
  const longOverShort = Math.max(base.w, base.h) / Math.min(base.w, base.h);
  return settings.orientation === 'landscape' ? longOverShort : 1 / longOverShort;
}

/** Ratio label as it will be exported, e.g. `9:16` for 16:9 in portrait. */
export function formatExportRatioLabel(settings: ExportSizeSettings): string | null {
  const base = baseRatio(settings);
  if (!base) {return null;}
  const long = Math.max(base.w, base.h);
  const short = Math.min(base.w, base.h);
  return settings.orientation === 'landscape' ? `${long}:${short}` : `${short}:${long}`;
}

function clampSide(value: number, limit: number): number {
  return Math.min(limit, Math.max(EXPORT_SIZE_MIN, Math.round(value)));
}

/** Recomputes the derived side from the anchor; scales both down if one exceeds `limit`. */
function normalizeExportSize(
  settings: ExportSizeSettings,
  limit: number = EXPORT_SIZE_MAX,
): ExportSizeSettings {
  const aspect = resolveExportAspect(settings);
  if (aspect === null) {return settings;}

  let width: number;
  let height: number;
  if (settings.anchor === 'width') {
    width = clampSide(settings.width, limit);
    height = width / aspect;
  } else {
    height = clampSide(settings.height, limit);
    width = height * aspect;
  }

  const overflow = Math.max(width, height) / limit;
  if (overflow > 1) {
    width /= overflow;
    height /= overflow;
  }
  return {
    ...settings,
    width: clampSide(width, limit),
    height: clampSide(height, limit),
  };
}

/** True when the requested anchor value had to be reduced to fit the limit. */
export function isExportSizeLimited(
  requested: ExportSizeSettings,
  limit: number = EXPORT_SIZE_MAX,
): boolean {
  const normalized = normalizeExportSize(requested, limit);
  return requested.anchor === 'width'
    ? normalized.width < Math.round(requested.width)
    : normalized.height < Math.round(requested.height);
}

export function applyExportWidth(
  settings: ExportSizeSettings,
  width: number,
  limit?: number,
): ExportSizeSettings {
  return normalizeExportSize({ ...settings, width, anchor: 'width' }, limit);
}

export function applyExportHeight(
  settings: ExportSizeSettings,
  height: number,
  limit?: number,
): ExportSizeSettings {
  return normalizeExportSize({ ...settings, height, anchor: 'height' }, limit);
}

export function applyExportAspectPreset(
  settings: ExportSizeSettings,
  aspectPreset: ExportAspectPreset,
  limit?: number,
): ExportSizeSettings {
  return normalizeExportSize({ ...settings, aspectPreset }, limit);
}

export function applyExportCustomRatio(
  settings: ExportSizeSettings,
  ratio: ExportRatio,
  limit?: number,
): ExportSizeSettings {
  if (!(ratio.w > 0) || !(ratio.h > 0) || !Number.isFinite(ratio.w) || !Number.isFinite(ratio.h)) {
    return settings;
  }
  return normalizeExportSize({ ...settings, customRatio: { ...ratio } }, limit);
}

/** Flips orientation and swaps width/height (anchor swaps along). */
export function applyExportOrientation(
  settings: ExportSizeSettings,
  orientation: ExportOrientation,
  limit?: number,
): ExportSizeSettings {
  if (settings.orientation === orientation) {return settings;}
  return normalizeExportSize(
    {
      ...settings,
      orientation,
      width: settings.height,
      height: settings.width,
      anchor: settings.anchor === 'width' ? 'height' : 'width',
    },
    limit,
  );
}

/** Largest centered rect of `aspect` inside the viewport (letterbox or pillarbox). */
export function computeExportFrameRect(
  viewportWidth: number,
  viewportHeight: number,
  aspect: number,
): ExportFrameRect {
  if (viewportWidth <= 0 || viewportHeight <= 0 || !(aspect > 0)) {
    return { left: 0, top: 0, width: viewportWidth, height: viewportHeight };
  }
  const viewportAspect = viewportWidth / viewportHeight;
  const width = aspect >= viewportAspect ? viewportWidth : viewportHeight * aspect;
  const height = aspect >= viewportAspect ? viewportWidth / aspect : viewportHeight;
  return {
    left: (viewportWidth - width) / 2,
    top: (viewportHeight - height) / 2,
    width,
    height,
  };
}

/**
 * Share of the live view height that the frame covers (1 when the frame fills the height).
 * The export camera shrinks its vertical extent by this factor so the image matches the frame.
 */
export function computeExportFrameHeightFraction(viewportAspect: number, aspect: number): number {
  if (!(viewportAspect > 0) || !(aspect > 0)) {return 1;}
  return aspect >= viewportAspect ? viewportAspect / aspect : 1;
}

/** Vertical FOV (degrees) of the export camera for a frame covering `heightFraction` of the view. */
export function computeExportFovDeg(liveFovDeg: number, heightFraction: number): number {
  if (heightFraction >= 1) {return liveFovDeg;}
  const halfRad = (liveFovDeg * Math.PI) / 360;
  return (Math.atan(Math.tan(halfRad) * heightFraction) * 360) / Math.PI;
}
