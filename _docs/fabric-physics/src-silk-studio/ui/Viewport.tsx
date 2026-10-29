import { useEffect, useRef } from 'react';
import { StudioEngine } from '../engine/StudioEngine.ts';
import {
  getViewportAspectPreset,
  viewportAspectRatio,
} from '../config/viewportAspect.ts';
import { useStudioStore } from '../state/studioStore.ts';
import { useContainAspectSize } from './useContainAspectSize.ts';

export function Viewport(): React.ReactElement {
  const boundsRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const viewportAspectPreset = useStudioStore((s) => s.viewportAspectPreset);
  const preset = getViewportAspectPreset(viewportAspectPreset);
  const aspect = viewportAspectRatio(preset);
  const { width, height } = useContainAspectSize(boundsRef, aspect);

  const bindEngine = useStudioStore((s) => s.bindEngine);
  const unbindEngine = useStudioStore((s) => s.unbindEngine);
  const setTransformMode = useStudioStore((s) => s.setTransformMode);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new StudioEngine();
    let disposed = false;

    void engine.mount(container).then(() => {
      if (!disposed) {
        bindEngine(engine);
      }
    });

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'w' || e.key === 'W') setTransformMode('translate');
      if (e.key === 'e' || e.key === 'E') setTransformMode('rotate');
    };
    window.addEventListener('keydown', onKey);

    return () => {
      disposed = true;
      window.removeEventListener('keydown', onKey);
      unbindEngine(engine);
      engine.dispose();
    };
  }, [bindEngine, unbindEngine, setTransformMode]);

  return (
    <div
      ref={boundsRef}
      className="flex h-full w-full items-center justify-center bg-base-300/40"
    >
      <div
        ref={mountRef}
        className="relative overflow-hidden bg-base-100 shadow-sm"
        style={{
          width: width > 0 ? `${String(width)}px` : undefined,
          height: height > 0 ? `${String(height)}px` : undefined,
        }}
        aria-label="3D viewport"
      />
    </div>
  );
}
