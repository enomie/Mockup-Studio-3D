import {
  type ExportGroundSurface,
  type ExportImageFormat,
  viewportExportDownloadFilename,
} from '@/scene/export-image';
import {
  applyExportAspectPreset,
  applyExportCustomRatio,
  applyExportHeight,
  applyExportOrientation,
  applyExportWidth,
  isFixedExportAspect,
  type ExportAspectPreset,
  type ExportOrientation,
  type ExportRatio,
  type ExportSizeSettings,
} from '@/scene/export-size';
import * as store from './app-store-internals';

export function setExportImageFormat(format: ExportImageFormat): void {
  if (store.state.exportImageFormat === format) {return;}
  store.setAppState({ ...store.state, exportImageFormat: format });
  store.emit();
}

export function setExportGroundSurface(surface: ExportGroundSurface): void {
  if (store.state.exportGroundSurface === surface) {return;}
  store.setAppState({ ...store.state, exportGroundSurface: surface });
  store.emit();
}

function updateExportSize(next: ExportSizeSettings): void {
  if (next === store.state.exportSize) {return;}
  store.setAppState({ ...store.state, exportSize: next });
  store.emit();
}

export function setExportAspectPreset(preset: ExportAspectPreset): void {
  updateExportSize(applyExportAspectPreset(store.state.exportSize, preset));
}

export function setExportCustomRatio(ratio: ExportRatio): void {
  updateExportSize(applyExportCustomRatio(store.state.exportSize, ratio));
}

export function setExportOrientation(orientation: ExportOrientation): void {
  updateExportSize(applyExportOrientation(store.state.exportSize, orientation));
}

export function setExportWidth(width: number): void {
  updateExportSize(applyExportWidth(store.state.exportSize, width));
}

export function setExportHeight(height: number): void {
  updateExportSize(applyExportHeight(store.state.exportSize, height));
}

export function setExportFrameVisible(visible: boolean): void {
  if (store.state.exportSize.frameVisible === visible) {return;}
  updateExportSize({ ...store.state.exportSize, frameVisible: visible });
}

export function setViewportPixelSize(width: number, height: number): void {
  const current = store.state.viewportPixelSize;
  if (current.width === width && current.height === height) {return;}
  store.setAppState({ ...store.state, viewportPixelSize: { width, height } });
  store.emit();
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Viewport raster export — same RenderPipeline + SMAA chain as the live view. */
export async function exportViewportImage(): Promise<void> {
  if (!store.sceneApi) {
    console.warn('[export] Scene is not ready.');
    return;
  }

  const format = store.state.exportImageFormat;
  const groundSurface =
    format === 'png-transparent' ? store.state.exportGroundSurface : 'viewport';
  const size = store.state.exportSize;
  const blob = await store.sceneApi.captureViewportImage({
    format,
    groundSurface,
    outputSize: isFixedExportAspect(size) ? { width: size.width, height: size.height } : undefined,
  });
  const filename = viewportExportDownloadFilename(format);
  triggerBlobDownload(blob, filename);
}

export type { ExportGroundSurface, ExportImageFormat } from '@/scene/export-image';
export type { ExportAspectPreset, ExportOrientation } from '@/scene/export-size';
