import { describe, expect, it } from 'vitest';
import {
  applyExportAspectPreset,
  applyExportCustomRatio,
  applyExportHeight,
  applyExportOrientation,
  applyExportWidth,
  computeExportFovDeg,
  computeExportFrameHeightFraction,
  computeExportFrameRect,
  defaultExportSizeSettings,
  formatExportRatioLabel,
  isExportSizeLimited,
  resolveExportAspect,
  type ExportSizeSettings,
} from './export-size';

function fixed(preset: ExportSizeSettings['aspectPreset']): ExportSizeSettings {
  return applyExportAspectPreset(defaultExportSizeSettings(), preset);
}

describe('export-size', () => {
  it('defaults to the viewport preset without a fixed aspect', () => {
    const settings = defaultExportSizeSettings();
    expect(settings.aspectPreset).toBe('viewport');
    expect(resolveExportAspect(settings)).toBeNull();
  });

  it('derives height from width and rounds to whole pixels', () => {
    const next = applyExportWidth(fixed('16:9'), 1000);
    expect(next.width).toBe(1000);
    expect(next.height).toBe(563);
    expect(next.anchor).toBe('width');
  });

  it('derives width from height', () => {
    const next = applyExportHeight(fixed('4:3'), 1500);
    expect(next.width).toBe(2000);
    expect(next.anchor).toBe('height');
  });

  it('keeps the anchor side when switching presets', () => {
    const next = applyExportAspectPreset(applyExportWidth(fixed('16:9'), 2000), '4:3');
    expect(next.width).toBe(2000);
    expect(next.height).toBe(1500);
  });

  it('swaps sides when the orientation flips', () => {
    const portrait = applyExportOrientation(fixed('16:9'), 'portrait');
    expect(portrait.width).toBe(2160);
    expect(portrait.height).toBe(3840);
    expect(formatExportRatioLabel(portrait)).toBe('9:16');
  });

  it('treats landscape as long side horizontal for 4:5', () => {
    const landscape = fixed('4:5');
    expect(resolveExportAspect(landscape)).toBeCloseTo(1.25);
    expect(formatExportRatioLabel(landscape)).toBe('5:4');
    expect(formatExportRatioLabel(applyExportOrientation(landscape, 'portrait'))).toBe('4:5');
  });

  it('clamps to the limit and scales the derived side down', () => {
    const requested = { ...applyExportOrientation(fixed('16:9'), 'portrait'), width: 6000, anchor: 'width' as const };
    const next = applyExportWidth(requested, 6000, 8192);
    expect(next.height).toBe(8192);
    expect(next.width).toBe(4608);
    expect(isExportSizeLimited(requested, 8192)).toBe(true);
  });

  it('ignores invalid custom ratios', () => {
    const custom = fixed('custom');
    expect(applyExportCustomRatio(custom, { w: 0, h: 9 })).toBe(custom);
    const valid = applyExportCustomRatio(custom, { w: 2.39, h: 1 });
    expect(resolveExportAspect(valid)).toBeCloseTo(2.39);
  });

  it('fits the frame as pillarbox or letterbox', () => {
    expect(computeExportFrameRect(1600, 900, 1)).toEqual({ left: 350, top: 0, width: 900, height: 900 });
    expect(computeExportFrameRect(900, 900, 2)).toEqual({ left: 0, top: 225, width: 900, height: 450 });
  });

  it('narrows the export fov only when the frame is wider than the view', () => {
    expect(computeExportFrameHeightFraction(1, 2)).toBe(0.5);
    expect(computeExportFrameHeightFraction(2, 1)).toBe(1);
    expect(computeExportFovDeg(50, 1)).toBe(50);
    const fov = computeExportFovDeg(90, 0.5);
    expect(Math.tan((fov * Math.PI) / 360)).toBeCloseTo(0.5);
  });
});
