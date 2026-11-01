import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MM_TO_M } from '@/units/length';
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
  <path class="path_red" stroke="#ff0000" fill="none" d="M0,0h10v20H0"/>
  <path class="path_green" stroke="#00ff00" fill="none" d="M0,25h12v5H0"/>
  <path class="path_blue" stroke="#0000ff" fill="none" d="M0,30h8v70H0"/>
</svg>`;

describe('extractPenPathsFromSvgText', () => {
  it('assigns paths by stroke color', () => {
    const paths = extractPenPathsFromSvgText(MINI_SVG, 8);
    expect(paths.cap.length).toBeGreaterThan(2);
    expect(paths.ring.length).toBeGreaterThan(2);
    expect(paths.body.length).toBeGreaterThan(2);
  });

  it('normalizes marker SVG with foot at y=0 and path coordinates in meters (mm)', () => {
    const svgText = readFileSync(join(FIXTURE_DIR, 'lathe-y-pen-marker.svg'), 'utf8');
    const raw = extractPenPathsFromSvgText(svgText);
    const lathe = normalizePenPaths(raw);

    expect(lathe.body.length).toBeGreaterThan(2);
    const bounds = globalBoundsFromRawPaths(raw);
    const normalized = normalizePenPaths(raw);
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
    expect(maxX).toBeCloseTo(bounds.maxX * MM_TO_M, 5);
    expect(minY).toBeCloseTo(0, 4);
    expect(Math.abs(bounds.maxX - 10)).toBeLessThan(0.1);
  });

  it('rings are closed contours around the shaft (9–10 mm radius, not a disc)', () => {
    for (const file of ['lathe-y-pen-marker.svg', 'lathe-y-pen-fountain.svg']) {
      const svgText = readFileSync(join(FIXTURE_DIR, file), 'utf8');
      const { ring } = normalizePenPaths(extractPenPathsFromSvgText(svgText));
      const xs = ring.map((p) => p.x);
      expect(Math.min(...xs), file).toBeCloseTo(0.009, 6);
      expect(Math.max(...xs), file).toBeCloseTo(0.01, 6);
      expect(ring[0].distanceTo(ring[ring.length - 1])).toBeLessThan(1e-6);
    }
  });
});
