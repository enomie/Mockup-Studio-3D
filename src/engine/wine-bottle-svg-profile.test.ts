import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Vector2 } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { prepareWineBottleGlassLatheProfile } from './wine-bottle-glass';
import {
  extractOpenPathPointsFromSvgText,
  normalizeOpenWallSvgToLathePoints,
  sampleWineBottleRadiusAtY,
  resolveWineBottleStirnRadiiAtY,
  sampleWineBottleWallRadiiAtY,
  wineBottleLatheProfileBounds,
} from './wine-bottle-svg-profile';
import { closeOuterWallProfileToLatheRing } from './wine-bottle-closed-wall-profile';

const PUBLIC = join(process.cwd(), 'public');

function syntheticClosedWallRaw(holeX: number, outerX: number, innerX: number, spanY: number) {
  const yFoot = spanY;
  const yLip = 0;
  return [
    { x: holeX, y: yFoot },
    { x: outerX, y: yFoot },
    { x: outerX, y: yLip },
    { x: innerX, y: yLip },
    { x: innerX, y: yFoot },
    { x: holeX, y: yFoot + 7 },
    { x: holeX, y: yFoot },
  ];
}

describe('wine-bottle-svg-profile', () => {
  it('normalizes open wall SVG to heightM with foot at y≈0', () => {
    const heightM = 0.29;
    const lathe = normalizeOpenWallSvgToLathePoints(
      syntheticClosedWallRaw(1, 50, 2.5, 820),
      heightM,
    );
    const bounds = wineBottleLatheProfileBounds(lathe);
    expect(bounds.minY).toBeGreaterThanOrEqual(-0.002);
    expect(bounds.maxY).toBeLessThanOrEqual(heightM + 0.002);
    expect(bounds.maxY).toBeGreaterThan(heightM * 0.98);
  });

  it('sampleWineBottleWallRadiiAtY returns inner and outer on horizontal wall cuts', () => {
    const heightM = 0.29;
    const ring = closeOuterWallProfileToLatheRing(
      [new Vector2(0.038, 0), new Vector2(0.038, heightM)],
      0.0025,
    );
    const profile = prepareWineBottleGlassLatheProfile(ring);
    const bounds = wineBottleLatheProfileBounds(profile);
    const foot = sampleWineBottleWallRadiiAtY(profile, bounds.minY);
    const lip = sampleWineBottleWallRadiiAtY(profile, bounds.maxY);
    expect(foot).not.toBeNull();
    expect(lip).not.toBeNull();
    expect(foot!.rOuter).toBeGreaterThan(foot!.rInner);
    expect(lip!.rOuter).toBeGreaterThan(lip!.rInner);
  });

  it('resolveWineBottleStirnRadiiAtY falls back to wall thickness on open outer cuts', () => {
    const profile = [new Vector2(0.038, 0), new Vector2(0.038, 0.29)];
    expect(sampleWineBottleWallRadiiAtY(profile, 0)).toBeNull();
    const foot = resolveWineBottleStirnRadiiAtY(profile, 0, 0.0025);
    expect(foot?.rOuter).toBeCloseTo(0.038, 4);
    expect(foot?.rInner).toBeCloseTo(0.0355, 4);
  });

  it('closeOuterWallProfileToLatheRing adds stirn radii for outer-only polylines', () => {
    const heightM = 0.29;
    const outerOnly = [new Vector2(0.038, 0), new Vector2(0.038, heightM)];
    const ring = closeOuterWallProfileToLatheRing(outerOnly, 0.0025);
    const profile = prepareWineBottleGlassLatheProfile(ring);
    const bounds = wineBottleLatheProfileBounds(profile);
    expect(sampleWineBottleWallRadiiAtY(profile, bounds.minY)).not.toBeNull();
    expect(sampleWineBottleWallRadiiAtY(profile, bounds.maxY)).not.toBeNull();
  });

  it('sampleWineBottleRadiusAtY returns outer radius at a height', () => {
    const open = [
      { x: 1, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 290 },
      { x: 2, y: 290 },
      { x: 1, y: 0 },
    ].map((p) => ({ ...p }));
    const wall = normalizeOpenWallSvgToLathePoints(open, 0.29);
    expect(sampleWineBottleRadiusAtY(wall, 0.29 * 0.5)).toBeCloseTo(0.04, 3);
    expect(sampleWineBottleRadiusAtY(wall, 0.29)).toBeCloseTo(0.04, 3);
  });

  it('parses closed bottle SVGs with expected belly radius', () => {
    const cases: { file: string; maxRadius: number }[] = [
      { file: 'bottle-bordeaux-open.svg', maxRadius: 0.038 },
      { file: 'bottle-alsace-open.svg', maxRadius: 0.038 },
      { file: 'bottle-sparkling-open.svg', maxRadius: 0.044 },
    ];
    const heightM = 0.29;

    for (const { file, maxRadius } of cases) {
      const svgText = readFileSync(join(PUBLIC, file), 'utf8');
      expect(svgText).toMatch(/Z"/i);
      const raw = extractOpenPathPointsFromSvgText(svgText, 48);
      expect(raw.length).toBeGreaterThan(20);

      const wall = normalizeOpenWallSvgToLathePoints(raw, heightM);
      const bounds = wineBottleLatheProfileBounds(wall);
      expect(bounds.minY).toBeGreaterThanOrEqual(-0.002);
      expect(bounds.maxY).toBeLessThanOrEqual(heightM + 0.002);
      expect(bounds.maxRadius).toBeCloseTo(maxRadius, 2);

      const latheProfile = prepareWineBottleGlassLatheProfile(wall);
      expect(sampleWineBottleRadiusAtY(latheProfile, heightM * 0.5)).toBeCloseTo(maxRadius, 2);
    }
  });
});
