import { useEffect, useRef, useState } from 'react';
import type { CameraReadout } from '@/scene/scene-api';
import { getCameraReadoutSnapshot } from '@/ui/store/app-store';

const EMPTY_READOUT: CameraReadout = {
  position: { x: 0, y: 0, z: 0 },
  target: { x: 0, y: 0, z: 0 },
  distance: 0,
  azimuthDeg: 0,
  elevationDeg: 0,
};

const READOUT_EPSILON = 1e-4;

function cameraReadoutEqual(a: CameraReadout, b: CameraReadout): boolean {
  return (
    Math.abs(a.position.x - b.position.x) < READOUT_EPSILON &&
    Math.abs(a.position.y - b.position.y) < READOUT_EPSILON &&
    Math.abs(a.position.z - b.position.z) < READOUT_EPSILON &&
    Math.abs(a.target.x - b.target.x) < READOUT_EPSILON &&
    Math.abs(a.target.y - b.target.y) < READOUT_EPSILON &&
    Math.abs(a.target.z - b.target.z) < READOUT_EPSILON &&
    Math.abs(a.distance - b.distance) < READOUT_EPSILON &&
    Math.abs(a.azimuthDeg - b.azimuthDeg) < READOUT_EPSILON &&
    Math.abs(a.elevationDeg - b.elevationDeg) < READOUT_EPSILON
  );
}

/** Polls engine readout while mounted — live during orbit/pan without flooding the store. */
export function useCameraReadout(): CameraReadout {
  const [readout, setReadout] = useState<CameraReadout>(
    () => getCameraReadoutSnapshot() ?? EMPTY_READOUT,
  );
  const lastRef = useRef(readout);

  useEffect(() => {
    let frameId = 0;

    const tick = (): void => {
      const next = getCameraReadoutSnapshot();
      if (next && !cameraReadoutEqual(lastRef.current, next)) {
        lastRef.current = next;
        setReadout(next);
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frameId); };
  }, []);

  return readout;
}
