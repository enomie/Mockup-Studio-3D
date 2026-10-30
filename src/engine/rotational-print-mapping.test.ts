import { describe, expect, it } from 'vitest';
import { CylinderGeometry } from 'three/webgpu';
import { bandUToTextureS } from './beverage-can-label-unfold';
import { mapPenBandUvToTextureST, penWrapTextureSpans } from './pen-body-wrap-unfold';
import {
  PRINT_UV_ATTRIBUTE,
  applyRotationalPrintUv,
  rotationalPrintFit,
  rotationalPrintUv,
  sampleRotationalPrint,
} from './rotational-print-mapping';

describe('rotationalPrintUv', () => {
  const band = { y0: 0.01, y1: 0.11 };

  it('maps +Z front to U=0.5 and −Z back to the seam', () => {
    expect(rotationalPrintUv(0, 0.06, 1, band)[0]).toBeCloseTo(0.5, 6);
    expect(rotationalPrintUv(0, 0.06, -1, band)[0]).toBeCloseTo(1, 6);
  });

  it('increases U towards +X (artwork not mirrored from the front)', () => {
    expect(rotationalPrintUv(1, 0.06, 0, band)[0]).toBeCloseTo(0.75, 6);
  });

  it('keeps V unclamped outside the band', () => {
    expect(rotationalPrintUv(0, 0, 1, band)[1]).toBeCloseTo(-0.1, 6);
    expect(rotationalPrintUv(0, 0.12, 1, band)[1]).toBeCloseTo(1.1, 6);
  });

  it('maps an arc band centered on +Z (wine bottle label)', () => {
    const arc = { ...band, phiStart: -Math.PI / 4, phiLength: Math.PI / 2 };
    expect(rotationalPrintUv(0, 0.06, 1, arc)[0]).toBeCloseTo(0.5, 6);
    const edge = rotationalPrintUv(Math.sin(Math.PI / 4), 0.06, Math.cos(Math.PI / 4), arc);
    expect(edge[0]).toBeCloseTo(1, 6);
    expect(rotationalPrintUv(1, 0.06, 0, arc)[0]).toBeGreaterThan(1);
    expect(rotationalPrintUv(0, 0.06, -1, arc)[0]).toBeGreaterThan(1);
  });
});

describe('applyRotationalPrintUv', () => {
  it('writes printUv and leaves uv untouched', () => {
    const geometry = new CylinderGeometry(0.03, 0.03, 0.1, 16, 2);
    const before = Array.from(geometry.getAttribute('uv').array);
    applyRotationalPrintUv(geometry, { y0: -0.05, y1: 0.05 });
    const printUv = geometry.getAttribute(PRINT_UV_ATTRIBUTE);
    expect(printUv.count).toBe(geometry.getAttribute('position').count);
    expect(Array.from(geometry.getAttribute('uv').array)).toEqual(before);
  });
});

describe('applyRotationalPrintUv seam', () => {
  it('keeps every triangle of a full wrap continuous in U', () => {
    const geometry = new CylinderGeometry(0.03, 0.03, 0.1, 24, 1, true, Math.PI);
    applyRotationalPrintUv(geometry, { y0: -0.05, y1: 0.05 });
    const printUv = geometry.getAttribute(PRINT_UV_ATTRIBUTE);
    const index = geometry.getIndex()!;
    for (let i = 0; i < index.count; i += 3) {
      const us = [0, 1, 2].map((k) => printUv.getX(index.getX(i + k)));
      expect(Math.max(...us) - Math.min(...us)).toBeLessThan(0.1);
    }
  });
});

describe('rotationalPrintFit', () => {
  it('falls back to spans of 1 without image size', () => {
    expect(rotationalPrintFit('wrap-width', 0.2, 0.1)).toEqual({
      layout: 'wrap-width',
      spanU: 1,
      spanV: 1,
    });
  });

  it('wrap-height matches the pen span helpers', () => {
    const fit = rotationalPrintFit('wrap-height', 0.04, 0.12, 800, 2000);
    const spans = penWrapTextureSpans(0.04, 0.12, 800, 2000);
    expect(fit.spanU).toBeCloseTo(spans.circumferenceSpan, 9);
    expect(fit.spanV).toBeCloseTo(spans.bodyLengthSpan, 9);
  });
});

describe('sampleRotationalPrint', () => {
  it('wrap-width: height-fit, narrow image leaves the sides unprinted', () => {
    const fit = rotationalPrintFit('wrap-width', 2, 1, 1, 1);
    expect(fit.spanU).toBeCloseTo(0.5, 9);
    const center = sampleRotationalPrint(0.5, 0.5, fit);
    expect(center.s).toBeCloseTo(0.5, 9);
    expect(center.mask).toBe(1);
    expect(sampleRotationalPrint(0.1, 0.5, fit).mask).toBe(0);
    expect(sampleRotationalPrint(0.3, 0.2, fit).s).toBeCloseTo(bandUToTextureS(0.3, 0.5), 9);
  });

  it('wrap-width: wide image is cropped, band stays printed', () => {
    const fit = rotationalPrintFit('wrap-width', 2, 1, 4, 1);
    const edge = sampleRotationalPrint(0, 0.5, fit);
    expect(edge.s).toBeCloseTo(-0.5, 9);
    expect(edge.mask).toBe(1);
  });

  it('masks points outside the band', () => {
    const fit = rotationalPrintFit('wrap-width', 2, 1, 2, 1);
    expect(sampleRotationalPrint(0.5, -0.01, fit).mask).toBe(0);
    expect(sampleRotationalPrint(0.5, 1.01, fit).mask).toBe(0);
    expect(sampleRotationalPrint(1.2, 0.5, fit).mask).toBe(0);
  });

  it('wrap-height matches mapPenBandUvToTextureST', () => {
    const fit = rotationalPrintFit('wrap-height', 0.04, 0.12, 800, 2000);
    const spans = penWrapTextureSpans(0.04, 0.12, 800, 2000);
    for (const [u, v] of [
      [0.5, 0.5],
      [0.1, 0.9],
      [0.8, 0.25],
    ] as const) {
      const sample = sampleRotationalPrint(u, v, fit);
      const legacy = mapPenBandUvToTextureST(u, v, spans);
      expect(sample.s).toBeCloseTo(legacy.s, 9);
      expect(sample.t).toBeCloseTo(legacy.t, 9);
    }
  });
});
