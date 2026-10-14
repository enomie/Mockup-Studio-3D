import {
  type ExportGroundSurface,
  type ExportImageFormat,
  viewportExportDownloadFilename,
} from '@/scene/export-image';
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
  const blob = await store.sceneApi.captureViewportImage({
    format,
    groundSurface,
  });
  const filename = viewportExportDownloadFilename(format);
  triggerBlobDownload(blob, filename);
}

export type { ExportGroundSurface, ExportImageFormat } from '@/scene/export-image';
