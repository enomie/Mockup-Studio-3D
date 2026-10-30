import { useEffect, useRef, useState } from 'react';
import { VIEWPORT_MAX_PIXEL_RATIO } from '@/constants';
import { MockupEngine } from '@/engine/mockup-engine';
import {
  computeExportFrameRect,
  formatExportRatioLabel,
  resolveExportAspect,
} from '@/scene/export-size';
import { setSceneApi, setViewportPixelSize } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

interface ViewportCssSize {
  width: number;
  height: number;
}

/** Dims everything outside the export aspect frame; ignores pointer input. */
function ExportAspectFrame({ viewport }: { viewport: ViewportCssSize }) {
  const exportSize = useAppStore((s) => s.exportSize);
  const aspect = resolveExportAspect(exportSize);
  if (aspect === null || !exportSize.frameVisible || viewport.width === 0 || viewport.height === 0) {
    return null;
  }

  const rect = computeExportFrameRect(viewport.width, viewport.height, aspect);
  return (
    <div className="viewport-export-frame" aria-hidden="true">
      <div
        className="viewport-export-frame__window"
        style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      >
        <span className="viewport-export-frame__label">
          {formatExportRatioLabel(exportSize)} · {exportSize.width} × {exportSize.height}
        </span>
      </div>
    </div>
  );
}

export function ViewportFrame() {
  const hostRef = useRef<HTMLDivElement>(null);
  const webgpuAvailable = useAppStore((s) => s.webgpuAvailable);

  const engineRef = useRef<MockupEngine | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState<ViewportCssSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {return;}
    const observer = new ResizeObserver(() => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      setViewportSize({ width, height });
      // Same rounding as the renderer drawing buffer.
      const pixelRatio = Math.min(window.devicePixelRatio, VIEWPORT_MAX_PIXEL_RATIO);
      setViewportPixelSize(Math.floor(width * pixelRatio), Math.floor(height * pixelRatio));
    });
    observer.observe(element);
    return () => { observer.disconnect(); };
  }, [webgpuAvailable]);

  useEffect(() => {
    if (!webgpuAvailable || !hostRef.current) {return;}

    const host = hostRef.current;
    let cancelled = false;

    MockupEngine.create(host)
      .then((instance) => {
        if (cancelled) {
          instance.dispose();
          return;
        }
        engineRef.current = instance;
        setSceneApi(instance);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      engineRef.current?.dispose();
      engineRef.current = null;
      setSceneApi(null);
    };
  }, [webgpuAvailable]);

  if (!webgpuAvailable) {
    return (
      <div className="viewport">
        <div className="viewport__gate">
          <div>
            <strong>WebGPU required</strong>
            <p className="viewport__gate-text">
              This device or browser does not support WebGPU.
              There is no WebGL fallback.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={viewportRef} className="viewport">
      <div ref={hostRef} className="viewport__canvas-host" />
      <ExportAspectFrame viewport={viewportSize} />
    </div>
  );
}
