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

const PUBLIC_LATHE = join(process.cwd(), 'public', 'profiles', 'lathe');

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

  it('parses open outer bottle SVGs with expected belly radius', () => {
    const cases: { file: string; maxRadius: number }[] = [
      { file: 'lathe-y-bottle-bordeaux-open.svg', maxRadius: 0.038 },
      { file: 'lathe-y-bottle-alsace-open.svg', maxRadius: 0.038 },
      { file: 'lathe-y-bottle-sparkling-open.svg', maxRadius: 0.044 },
    ];
    const heightM = 0.29;

    for (const { file, maxRadius } of cases) {
      const svgText = readFileSync(join(PUBLIC_LATHE, file), 'utf8');
      expect(svgText).toContain('<path');
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

  it('each profile SVG is parsed independently (no runtime reshape)', () => {
    const heightM = 0.29;
    const files = [
      'lathe-y-bottle-bordeaux-open.svg',
      'lathe-y-bottle-alsace-open.svg',
      'lathe-y-bottle-sparkling-open.svg',
    ] as const;
    const maxRadii: number[] = [];
    for (const file of files) {
      const svgText = readFileSync(join(PUBLIC_LATHE, file), 'utf8');
      const wall = normalizeOpenWallSvgToLathePoints(
        extractOpenPathPointsFromSvgText(svgText, 48),
        heightM,
      );
      maxRadii.push(wineBottleLatheProfileBounds(wall).maxRadius);
    }
    expect(maxRadii[2]).toBeGreaterThan(maxRadii[0] + 0.004);
  });
});
