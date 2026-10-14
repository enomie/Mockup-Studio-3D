import { describe, expect, it } from 'vitest';
import { Vector2 } from 'three/webgpu';
import {
  computePenHeightM,
  PEN_MAX_RADIUS_DEFAULT_M,
} from '@/scene/asset-pen';
import { bandUToTextureS } from './beverage-can-label-unfold';
import {
  mapPenBandUvToTextureST,
  maxBodyRadiusM,
  penBodyWrapAspectNominal,
  penBodyYBounds,
  penWrapCircumferenceSpan,
  penWrapBodyLengthSpan,
  penWrapTextureSpans,
  rotatePenWrapTextureSt180,
} from './pen-body-wrap-unfold';

describe('penBodyWrapAspectNominal', () => {
  it('matches default pen height calibration', () => {
    const aspect = penBodyWrapAspectNominal(PEN_MAX_RADIUS_DEFAULT_M);
    expect(aspect).toBeGreaterThan(0.2);
    expect(aspect).toBeLessThan(0.5);
    expect(computePenHeightM(PEN_MAX_RADIUS_DEFAULT_M)).toBeCloseTo(0.1412, 3);
  });
});

describe('penBodyYBounds', () => {
  it('returns span for body points', () => {
    const pts = [new Vector2(0.01, 0), new Vector2(0.01, 0.12)];
    const { y0, y1 } = penBodyYBounds(pts);
    expect(y0).toBe(0);
    expect(y1).toBe(0.12);
  });
});

describe('maxBodyRadiusM', () => {
  it('uses max x on body profile points', () => {
    const pts = [new Vector2(0.005, 0), new Vector2(0.0065, 0.1), new Vector2(0.004, 0.12)];
    expect(maxBodyRadiusM(pts)).toBeCloseTo(0.0065, 6);
  });
});

describe('pen wrap 90° texture spans', () => {
  const planeW = 0.04;
  const planeH = 0.12;
  const imageW = 800;
  const imageH = 2000;

  it('maps circumference from image height span', () => {
    const tSpan = penWrapCircumferenceSpan(planeW, planeH, imageW, imageH);
    const sSpan = penWrapBodyLengthSpan(planeW, planeH, imageW, imageH);
    expect(tSpan).toBeGreaterThan(1);
    expect(sSpan).toBeLessThan(1);
  });

  it('mapPenBandUvToTextureST matches bandUToTextureS on both axes', () => {
    const spans = penWrapTextureSpans(planeW, planeH, imageW, imageH);
    const { s, t } = mapPenBandUvToTextureST(0.5, 0.5, spans);
    expect(t).toBeCloseTo(bandUToTextureS(0.5, spans.circumferenceSpan), 6);
    expect(s).toBeCloseTo(bandUToTextureS(0.5, spans.bodyLengthSpan), 6);
  });

  it('keeps image center on band U=0.5 after circumference flip and 180°', () => {
    const spans = penWrapTextureSpans(planeW, planeH, imageW, imageH);
    const { t } = mapPenBandUvToTextureST(0.5, 0.25, spans);
    expect(t).toBeCloseTo(0.5, 5);
  });

  it('rotatePenWrapTextureSt180 swaps ends on both axes', () => {
    const { s, t } = rotatePenWrapTextureSt180(0.2, 0.8);
    expect(s).toBeCloseTo(0.8, 6);
    expect(t).toBeCloseTo(0.2, 6);
  });
});
