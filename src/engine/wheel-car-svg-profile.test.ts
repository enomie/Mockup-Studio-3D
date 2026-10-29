import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defaultWheelCarParams } from '@/scene/asset-wheel-car';
import {
  clearRawWheelCarPathsCache,
  extractWheelCarPathsFromSvgText,
  loadWheelCarLatheProfiles,
  maxRadiusFromLatheProfile,
  normalizeWheelCarPaths,
  setRawWheelCarPathsCache,
} from './wheel-car-svg-profile';

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../public/profiles/lathe',
);

describe('wheel-car-svg-profile', () => {
  it('extracts tire, rim outer, and rim inner paths from lathe-x-wheel-car.svg', () => {
    const svgText = readFileSync(join(FIXTURE_DIR, 'lathe-x-wheel-car.svg'), 'utf8');
    const raw = extractWheelCarPathsFromSvgText(svgText);
    expect(raw.tire.length).toBeGreaterThan(3);
    expect(raw.rimOuter.length).toBeGreaterThan(3);
    expect(raw.rimInner.length).toBeGreaterThan(3);
  });

  it('scales lathe profiles uniformly to outerRadiusM', () => {
    const svgText = readFileSync(join(FIXTURE_DIR, 'lathe-x-wheel-car.svg'), 'utf8');
    const raw = extractWheelCarPathsFromSvgText(svgText);
    const outerRadiusM = defaultWheelCarParams().outerRadiusM;
    const lathe = normalizeWheelCarPaths(raw, outerRadiusM);

    const maxTireR = maxRadiusFromLatheProfile(lathe.tire);
    expect(maxTireR).toBeCloseTo(outerRadiusM, 3);
  });

  it('loadWheelCarLatheProfiles uses cache', async () => {
    clearRawWheelCarPathsCache();
    const svgText = readFileSync(join(FIXTURE_DIR, 'lathe-x-wheel-car.svg'), 'utf8');
    const raw = extractWheelCarPathsFromSvgText(svgText);
    setRawWheelCarPathsCache(raw);

    const outerRadiusM = 0.25;
    const profiles = await loadWheelCarLatheProfiles(outerRadiusM);
    expect(profiles.tire.length).toBeGreaterThan(3);
    expect(maxRadiusFromLatheProfile(profiles.tire)).toBeCloseTo(outerRadiusM, 3);
    clearRawWheelCarPathsCache();
  });
});
