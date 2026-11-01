import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extractLathePathPointsBySlot,
  extractLatheSubpathPointsBySlot,
  lathePathSlotForSvgPath,
  parseLathePathClassStrokeMap,
} from './lathe-svg-path-slots';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

function parseFirstPath(svg: string) {
  const loader = new SVGLoader();
  const data = loader.parse(svg);
  const path = data.paths.at(0);
  if (path === undefined) {
    throw new Error('no path');
  }
  return path;
}

describe('lathe-svg-path-slots', () => {
  it('maps class tokens to slots', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <path class="path_green" fill="none" d="M0,0 L10,0"/>
    </svg>`;
    const classStroke = parseLathePathClassStrokeMap(svg);
    const slot = lathePathSlotForSvgPath(parseFirstPath(svg), classStroke);
    expect(slot).toBe(1);
  });

  it('maps inline stroke when class absent', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <path stroke="#f00" fill="none" d="M0,0 L10,0"/>
    </svg>`;
    const classStroke = parseLathePathClassStrokeMap(svg);
    const slot = lathePathSlotForSvgPath(parseFirstPath(svg), classStroke);
    expect(slot).toBe(0);
  });

  it('ignores non-slot strokes', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <path stroke="#ec008c" fill="none" d="M0,0 L10,0"/>
    </svg>`;
    const classStroke = parseLathePathClassStrokeMap(svg);
    const slot = lathePathSlotForSvgPath(parseFirstPath(svg), classStroke);
    expect(slot).toBeNull();
  });

  it('extracts three slots from mini pen-like svg', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <path class="path_red" stroke="#ff0000" fill="none" d="M0,0h10v20H0"/>
      <path class="path_green" stroke="#00ff00" fill="none" d="M0,25h12v5H0"/>
      <path class="path_blue" stroke="#0000ff" fill="none" d="M0,30h8v70H0"/>
    </svg>`;
    const slots = extractLathePathPointsBySlot(svg, 8);
    expect(slots[0].length).toBeGreaterThan(2);
    expect(slots[1].length).toBeGreaterThan(2);
    expect(slots[2].length).toBeGreaterThan(2);
  });

  it('extractLatheSubpathPointsBySlot uses first subpath for slot 0', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <path class="path_red" stroke="#ff0000" fill="none" d="M0,0 L5,10 L0,20"/>
    </svg>`;
    const points = extractLatheSubpathPointsBySlot(svg, 0, 8);
    expect(points.length).toBeGreaterThan(1);
  });

  it('reads Illustrator exports: CSS classes with color keywords and <rect>', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs><style>
        .cls-1 { stroke: red; stroke-miterlimit: 10; }
        .cls-1, .cls-2 { fill: none; stroke-width: .28px; }
        .cls-2 { stroke: lime; }
      </style></defs>
      <path class="cls-1" d="M0,0h10v20H0"/>
      <rect class="cls-2" x="20" y="0" width="2" height="4" rx=".5" ry=".5"/>
    </svg>`;
    const slots = extractLathePathPointsBySlot(svg, 8);
    expect(slots[0].length).toBeGreaterThan(2);
    expect(slots[1].length).toBeGreaterThan(2);
    const ringX = slots[1].map((p) => p.x);
    expect(Math.min(...ringX)).toBeCloseTo(20, 3);
    expect(Math.max(...ringX)).toBeCloseTo(22, 3);
  });

  it('shipped lathe SVGs follow the convention (mm viewBox, inline slot paths, no CSS)', () => {
    const dir = join(process.cwd(), 'public', 'profiles', 'lathe');
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
      const text = readFileSync(join(dir, file), 'utf8');
      expect(text, file).not.toMatch(/<style|<rect|width="|height="|transform=/);
      expect(text, file).toMatch(/<path class="path_red" stroke="#ff0000"/);
    }
  });
});
