/**
 * Regenerate public/profiles/lathe/lathe-y-bottle-*-open.svg as closed glass-wall loops (outer + inner + lip/foot).
 * Optional authoring helper — writes closed wall loops to disk (review before commit).
 * Run: npx vite-node scripts/generate-wine-bottle-wall-svgs.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { Vector2 } from 'three/webgpu';
import type { WineBottleBodyProfile } from '../src/scene/asset-wine-bottle';

const WALL_THICKNESS_M = 0.0025;

const dom = new JSDOM();
// SVGLoader.parse needs DOMParser outside Vitest.
globalThis.DOMParser = dom.window.DOMParser;
import { closeOuterWallProfileToLatheRing } from '../src/engine/wine-bottle-closed-wall-profile';
import { prepareWineBottleGlassLatheProfile } from '../src/engine/wine-bottle-glass';
import {
  extractOpenPathPointsFromSvgText,
  normalizeOpenWallSvgToLathePoints,
  type WineBottleSvgPoint2,
} from '../src/engine/wine-bottle-svg-profile';

const HEIGHT_M = 0.29;
const PUBLIC_LATHE = join(process.cwd(), 'public', 'profiles', 'lathe');

const FILES: { profile: WineBottleBodyProfile; file: string }[] = [
  { profile: 'bordeaux', file: 'lathe-y-bottle-bordeaux-open.svg' },
  { profile: 'alsace', file: 'lathe-y-bottle-alsace-open.svg' },
  { profile: 'sparkling', file: 'lathe-y-bottle-sparkling-open.svg' },
];

function latheToSvgPoints(
  lathe: Vector2[],
  rawPoints: WineBottleSvgPoint2[],
): WineBottleSvgPoint2[] {
  const maxY = rawPoints.reduce((m, p) => Math.max(m, p.y), -Infinity);
  const minY = rawPoints.reduce((m, p) => Math.min(m, p.y), Infinity);
  const spanY = maxY - minY;
  const scale = HEIGHT_M / spanY;

  return lathe.map((p) => ({
    x: p.x / scale,
    y: maxY - p.y / scale,
  }));
}

function pointsToPathD(points: WineBottleSvgPoint2[]): string {
  if (points.length === 0) {
    return '';
  }
  const [first, ...rest] = points;
  const segments = rest.map((p) => `L ${p.x.toFixed(3)} ${p.y.toFixed(3)}`);
  return `M ${first.x.toFixed(3)} ${first.y.toFixed(3)} ${segments.join(' ')} Z`;
}

function viewBoxFromRaw(raw: WineBottleSvgPoint2[]): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of raw) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 2;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  return `${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
}

function buildSvg(pathD: string, viewBox: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="${viewBox}">
  <path class="path_red" fill="none" stroke="#ff0000" stroke-miterlimit="10" d="${pathD}"/>
</svg>
`;
}

for (const { file } of FILES) {
  const path = join(PUBLIC_LATHE, file);
  const svgText = readFileSync(path, 'utf8');
  const raw = extractOpenPathPointsFromSvgText(svgText, 48);
  const openWall = normalizeOpenWallSvgToLathePoints(raw, HEIGHT_M);
  const ring = closeOuterWallProfileToLatheRing(openWall, WALL_THICKNESS_M);
  const latheProfile = prepareWineBottleGlassLatheProfile(ring);
  const closedLoop = [...latheProfile, latheProfile[0].clone()];
  const svgPoints = latheToSvgPoints(closedLoop, raw);
  const pathD = pointsToPathD(svgPoints);
  const viewBox = viewBoxFromRaw(svgPoints);
  writeFileSync(path, `${buildSvg(pathD, viewBox)}\n`, 'utf8');
  console.log(`Wrote ${file} (${latheProfile.length} wall points)`);
}
