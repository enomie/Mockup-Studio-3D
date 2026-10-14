import { useEffect, useRef } from 'react';
import { MockupEngine } from '@/engine/mockup-engine';
import { setSceneApi } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

export function ViewportFrame() {
  const hostRef = useRef<HTMLDivElement>(null);
  const webgpuAvailable = useAppStore((s) => s.webgpuAvailable);

  const engineRef = useRef<MockupEngine | null>(null);

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
            <p style={{ margin: '8px 0 0' }}>
              This device or browser does not support WebGPU.
              There is no WebGL fallback.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="viewport">
      <div ref={hostRef} className="viewport__canvas-host" />
    </div>
  );
}
