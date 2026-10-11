import { clamp } from '@/units/math';

export { clamp };

/** Half of `.panel-slider__thumb` width — keeps thumbs inside the track. */
const SLIDER_THUMB_RADIUS_PX = 7;

export function pointerToRatio(clientX: number, rect: DOMRect): number {
  const innerWidth = rect.width - SLIDER_THUMB_RADIUS_PX * 2;
  if (innerWidth <= 0) return 0;
  return clamp((clientX - rect.left - SLIDER_THUMB_RADIUS_PX) / innerWidth, 0, 1);
}

export function thumbLeftCss(ratio: number): string {
  return `calc(${SLIDER_THUMB_RADIUS_PX}px + (100% - ${SLIDER_THUMB_RADIUS_PX * 2}px) * ${ratio})`;
}

export function trackFillLeftCss(ratio: number): string {
  return thumbLeftCss(ratio);
}

export function trackFillWidthCss(ratio: number): string {
  return `calc((100% - ${SLIDER_THUMB_RADIUS_PX * 2}px) * ${ratio})`;
}

function snapToStep(value: number, min: number, step: number): number {
  if (step <= 0) return value;
  const steps = Math.round((value - min) / step);
  return min + steps * step;
}

export function valueToRatio(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

export function ratioToValue(ratio: number, min: number, max: number, step: number): number {
  const raw = min + clamp(ratio, 0, 1) * (max - min);
  return snapToStep(raw, min, step);
}
