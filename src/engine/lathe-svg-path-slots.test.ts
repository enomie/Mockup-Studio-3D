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
});
