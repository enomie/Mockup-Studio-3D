/**
 * One-shot: bake pen lathe SVGs to mm coordinates in viewBox 0 0 10 200 (no transform group).
 * Run: npx tsx scripts/bake-pen-lathe-svgs.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import {
  LATHE_PATH_SLOT_CLASSES,
  LATHE_PATH_SLOT_STROKES,
} from '../src/engine/lathe-svg-path-slots.ts';
import {
  extractPenPathsFromSvgText,
  type PenSvgPartId,
} from '../src/engine/pen-svg-profile.ts';

const dom = new JSDOM();
globalThis.DOMParser = dom.window.DOMParser;

const PART_ORDER: PenSvgPartId[] = ['cap', 'ring', 'body'];

const SLOT_BY_PART: Record<PenSvgPartId, 0 | 1 | 2> = {
  cap: 0,
  ring: 1,
  body: 2,
};

function pointsToPathD(points: { x: number; y: number }[]): string {
  if (points.length === 0) {
    return '';
  }
  const fmt = (n: number): string => {
    const rounded = Math.round(n * 10000) / 10000;
    return String(rounded);
  };
  const [first, ...rest] = points;
  let d = `M${fmt(first.x)},${fmt(first.y)}`;
  for (const p of rest) {
    d += `L${fmt(p.x)},${fmt(p.y)}`;
  }
  return d;
}

function bakeFile(filename: 'lathe-y-pen-marker.svg' | 'lathe-y-pen-fountain.svg'): void {
  const dir = join(process.cwd(), 'public/profiles/lathe');
  const inputPath = join(dir, filename);
  const svgText = readFileSync(inputPath, 'utf8');
  const paths = extractPenPathsFromSvgText(svgText, 24);

  const pathEls = PART_ORDER.map((part) => {
    const d = pointsToPathD(paths[part]);
    const slot = SLOT_BY_PART[part];
    const className = LATHE_PATH_SLOT_CLASSES[slot];
    const stroke = LATHE_PATH_SLOT_STROKES[slot];
    return `      <path class="${className}" stroke="${stroke}" fill="none" stroke-miterlimit="10" d="${d}"/>`;
  });

  const out = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 10 200" width="10mm" height="200mm">
  <g id="Layer_1">
${pathEls.join('\n')}
  </g>
</svg>
`;

  writeFileSync(inputPath, out, 'utf8');
  console.log(`Baked ${filename}`);
}

bakeFile('lathe-y-pen-marker.svg');
bakeFile('lathe-y-pen-fountain.svg');
