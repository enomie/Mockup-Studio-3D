import { useEffect, useState, type RefObject } from 'react';
import { containSize } from '../config/viewportAspect.ts';

export function useContainAspectSize(
  boundsRef: RefObject<HTMLElement | null>,
  aspect: number,
): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = boundsRef.current;
    if (!el) return;

    const update = (): void => {
      const next = containSize(el.clientWidth, el.clientHeight, aspect);
      setSize(next);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [boundsRef, aspect]);

  return size;
}
