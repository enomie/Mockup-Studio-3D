import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PEN_MAX_RADIUS_DEFAULT_M } from '@/scene/asset-pen';
import {
  extractPenPathsFromSvgText,
  globalBoundsFromRawPaths,
  normalizePenPaths,
} from './pen-svg-profile';

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../public/profiles/lathe',
);

const MINI_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 100">
  <path stroke="#ff0000" fill="none" d="M0,0h10v20H0"/>
  <path stroke="#00ff00" fill="none" d="M0,25h12v5H0"/>
  <path stroke="#0000ff" fill="none" d="M0,30h8v70H0"/>
</svg>`;

describe('extractPenPathsFromSvgText', () => {
  it('assigns paths by stroke color', () => {
    const paths = extractPenPathsFromSvgText(MINI_SVG, 8);
    expect(paths.cap.length).toBeGreaterThan(2);
    expect(paths.ring.length).toBeGreaterThan(2);
    expect(paths.body.length).toBeGreaterThan(2);
  });

  it('normalizes marker SVG with foot at y=0 and max radius', () => {
    const svgText = readFileSync(join(FIXTURE_DIR, 'pen-marker.svg'), 'utf8');
    const raw = extractPenPathsFromSvgText(svgText);
    const maxRadiusM = PEN_MAX_RADIUS_DEFAULT_M;
    const lathe = normalizePenPaths(raw, maxRadiusM);

    expect(lathe.body.length).toBeGreaterThan(2);
    const bounds = globalBoundsFromRawPaths(raw);
    const normalized = normalizePenPaths(raw, maxRadiusM);
    let maxX = 0;
    let minY = Infinity;
    for (const part of [normalized.cap, normalized.ring, normalized.body]) {
      for (const p of part) {
        maxX = Math.max(maxX, p.x);
      }
    }
    for (const p of normalized.body) {
      minY = Math.min(minY, p.y);
    }
    expect(maxX).toBeCloseTo(maxRadiusM, 3);
    expect(minY).toBeCloseTo(0, 3);
    expect(bounds.maxX).toBeCloseTo(28.35, 1);
  });
});
