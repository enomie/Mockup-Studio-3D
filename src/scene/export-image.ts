/** Raster export format selected in the Export panel (UI store). */
export type ExportImageFormat = 'png-transparent' | 'jpeg';

/** How the ground plane appears in a PNG export capture. */
export type ExportGroundSurface = 'viewport' | 'contact-shadows-only';

export interface CaptureViewportImageOptions {
  format: ExportImageFormat;
  jpegQuality?: number;
  /** Default `viewport`. `contact-shadows-only` applies only with `png-transparent`. */
  groundSurface?: ExportGroundSurface;
  /**
   * Fixed output size in pixels. The image shows the viewport frame of that aspect
   * (largest centered rect). Omitted = capture the live canvas as-is.
   */
  outputSize?: { width: number; height: number };
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Local wall-clock stamp for download filenames (`YYYYMMDDHHmmss`). */
export function formatExportDateTimeSuffix(date: Date = new Date()): string {
  return (
    `${date.getFullYear()}` +
    pad2(date.getMonth() + 1) +
    pad2(date.getDate()) +
    pad2(date.getHours()) +
    pad2(date.getMinutes()) +
    pad2(date.getSeconds())
  );
}

export function buildExportDownloadFilename(
  baseName: string,
  extension: string,
  date: Date = new Date(),
): string {
  const ext = extension.startsWith('.') ? extension.slice(1) : extension;
  return `${baseName}-${formatExportDateTimeSuffix(date)}.${ext}`;
}

export function viewportExportDownloadFilename(
  format: ExportImageFormat,
  date: Date = new Date(),
): string {
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  return buildExportDownloadFilename('mockup', ext, date);
}
