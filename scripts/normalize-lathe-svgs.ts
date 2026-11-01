/**
 * Normalizes shipped lathe profile SVGs to the project convention:
 * 1 SVG unit = 1 mm, `viewBox` only (no width/height), slot paths as plain `<path>` with
 * `class="path_red|path_green|path_blue"` and hex stroke inline. Curves are kept (affine transform
 * of path data), so files stay editable.
 *
 * Run: npx tsx scripts/normalize-lathe-svgs.ts                  (all files, uses factors below)
 *      npx tsx scripts/normalize-lathe-svgs.ts <file.svg>        (format only, factor 1)
 *      npx tsx scripts/normalize-lathe-svgs.ts <file.svg> --pt   (Illustrator pt → mm)
 * Single files are also shifted so the top-most geometry sits at y = 0 (x / axis unchanged).
 *
 * Spec: _docs/plans/plan-lathe-svg-units-mm.md
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { JSDOM } from 'jsdom';
import {
  LATHE_PATH_SLOT_CLASSES,
  LATHE_PATH_SLOT_STROKES,
  extractLathePathPointsBySlot,
  lathePathSlotForElement,
  parseLathePathClassStrokeMap,
  type LathePathSlot,
} from '../src/engine/lathe-svg-path-slots.ts';

const dom = new JSDOM();
globalThis.DOMParser = dom.window.DOMParser;

const LATHE_DIR = join(process.cwd(), 'public/profiles/lathe');

interface Affine {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

/** Scale factors for a file; translation is derived so all geometry starts at (0, 0) … except axis. */
type FactorSpec =
  | { kind: 'identity' }
  | { kind: 'uniform'; s: number }
  /** y-lathe: x = radius from axis (x=0 kept), y scaled; separate factors per axis. */
  | { kind: 'xy'; sx: number; sy: number };

const fmt = (n: number): string => {
  const r = Math.round(n * 10000) / 10000;
  return Object.is(r, -0) ? '0' : String(r);
};

// ---------------------------------------------------------------- path data

type Seg = { cmd: string; args: number[] };

const ARG_COUNT: Record<string, number> = {
  M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0,
};

function parsePathData(d: string): Seg[] {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) ?? [];
  const segs: Seg[] = [];
  let i = 0;
  let cmd = '';
  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[a-zA-Z]$/.test(t)) {
      cmd = t;
      i += 1;
      if (cmd.toUpperCase() === 'Z') {
        segs.push({ cmd, args: [] });
        continue;
      }
    }
    const n = ARG_COUNT[cmd.toUpperCase()];
    if (n === undefined) {
      throw new Error(`Unsupported path command "${cmd}"`);
    }
    const args = tokens.slice(i, i + n).map(Number);
    if (args.length < n || args.some(Number.isNaN)) {
      throw new Error(`Bad args for "${cmd}" in path data`);
    }
    segs.push({ cmd, args });
    i += n;
    // Implicit repeat: M → L, m → l.
    if (cmd === 'M') {cmd = 'L';}
    if (cmd === 'm') {cmd = 'l';}
  }
  return segs;
}

/** Converts to absolute M/L/C/Q/A/Z (H/V/S/T expanded), then applies the affine map. */
function transformPathData(d: string, a: Affine): string {
  const segs = parsePathData(d);
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let lastCtrlX = 0;
  let lastCtrlY = 0;
  let lastCmd = '';
  const out: string[] = [];
  const P = (x: number, y: number): string => `${fmt(x * a.sx + a.tx)},${fmt(y * a.sy + a.ty)}`;

  for (const { cmd, args } of segs) {
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? cx : 0;
    const oy = rel ? cy : 0;
    switch (C) {
      case 'M':
        cx = args[0] + ox; cy = args[1] + oy; startX = cx; startY = cy;
        out.push(`M${P(cx, cy)}`);
        break;
      case 'L':
        cx = args[0] + ox; cy = args[1] + oy;
        out.push(`L${P(cx, cy)}`);
        break;
      case 'H':
        cx = args[0] + (rel ? cx : 0);
        out.push(`L${P(cx, cy)}`);
        break;
      case 'V':
        cy = args[0] + (rel ? cy : 0);
        out.push(`L${P(cx, cy)}`);
        break;
      case 'C': {
        const [x1, y1, x2, y2, x, y] = args;
        out.push(`C${P(x1 + ox, y1 + oy)} ${P(x2 + ox, y2 + oy)} ${P(x + ox, y + oy)}`);
        lastCtrlX = x2 + ox; lastCtrlY = y2 + oy;
        cx = x + ox; cy = y + oy;
        break;
      }
      case 'S': {
        const [x2, y2, x, y] = args;
        const reflect = lastCmd === 'C' || lastCmd === 'S';
        const x1 = reflect ? 2 * cx - lastCtrlX : cx;
        const y1 = reflect ? 2 * cy - lastCtrlY : cy;
        out.push(`C${P(x1, y1)} ${P(x2 + ox, y2 + oy)} ${P(x + ox, y + oy)}`);
        lastCtrlX = x2 + ox; lastCtrlY = y2 + oy;
        cx = x + ox; cy = y + oy;
        break;
      }
      case 'Q': {
        const [x1, y1, x, y] = args;
        out.push(`Q${P(x1 + ox, y1 + oy)} ${P(x + ox, y + oy)}`);
        lastCtrlX = x1 + ox; lastCtrlY = y1 + oy;
        cx = x + ox; cy = y + oy;
        break;
      }
      case 'T': {
        const reflect = lastCmd === 'Q' || lastCmd === 'T';
        const x1 = reflect ? 2 * cx - lastCtrlX : cx;
        const y1 = reflect ? 2 * cy - lastCtrlY : cy;
        out.push(`Q${P(x1, y1)} ${P(args[0] + ox, args[1] + oy)}`);
        lastCtrlX = x1; lastCtrlY = y1;
        cx = args[0] + ox; cy = args[1] + oy;
        break;
      }
      case 'A': {
        const [rx, ry, rot, large, sweep, x, y] = args;
        if (rot !== 0 && Math.abs(a.sx) !== Math.abs(a.sy)) {
          throw new Error('Rotated arc with non-uniform scale is not supported');
        }
        const flip = a.sx * a.sy < 0 ? 1 - sweep : sweep;
        out.push(
          `A${fmt(rx * Math.abs(a.sx))},${fmt(ry * Math.abs(a.sy))} ${fmt(rot)} ${large} ${flip} ${P(x + ox, y + oy)}`,
        );
        cx = x + ox; cy = y + oy;
        break;
      }
      case 'Z':
        out.push('Z');
        cx = startX; cy = startY;
        break;
    }
    lastCmd = C;
  }
  return out.join('');
}

function rectToPathData(el: Element): string {
  const num = (name: string): number => Number(el.getAttribute(name) ?? 0);
  const x = num('x');
  const y = num('y');
  const w = num('width');
  const h = num('height');
  let rx = el.hasAttribute('rx') ? num('rx') : num('ry');
  let ry = el.hasAttribute('ry') ? num('ry') : rx;
  rx = Math.min(rx, w / 2);
  ry = Math.min(ry, h / 2);
  if (rx <= 0 || ry <= 0) {
    return `M${x},${y}H${x + w}V${y + h}H${x}Z`;
  }
  return [
    `M${x + rx},${y}`,
    `H${x + w - rx}`,
    `A${rx},${ry} 0 0 1 ${x + w},${y + ry}`,
    `V${y + h - ry}`,
    `A${rx},${ry} 0 0 1 ${x + w - rx},${y + h}`,
    `H${x + rx}`,
    `A${rx},${ry} 0 0 1 ${x},${y + h - ry}`,
    `V${y + ry}`,
    `A${rx},${ry} 0 0 1 ${x + rx},${y}`,
    'Z',
  ].join('');
}

// ---------------------------------------------------------------- files

interface SlotElement {
  slot: LathePathSlot | null;
  className: string;
  d: string;
}

function readSlotElements(svgText: string): SlotElement[] {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const classStroke = parseLathePathClassStrokeMap(svgText);
  const out: SlotElement[] = [];
  for (const el of Array.from(doc.querySelectorAll('path, rect, line'))) {
    const tag = el.tagName.toLowerCase();
    let d: string;
    if (tag === 'path') {
      d = el.getAttribute('d') ?? '';
    } else if (tag === 'rect') {
      d = rectToPathData(el);
    } else {
      const n = (k: string): number => Number(el.getAttribute(k) ?? 0);
      d = `M${n('x1')},${n('y1')}L${n('x2')},${n('y2')}`;
    }
    out.push({
      slot: lathePathSlotForElement(el, classStroke),
      className: el.getAttribute('class') ?? '',
      d,
    });
  }
  return out;
}

function boundsOf(svgText: string, slots: LathePathSlot[]): {
  minX: number; maxX: number; minY: number; maxY: number;
} {
  const all = extractLathePathPointsBySlot(svgText, 64);
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  for (const s of slots) {
    for (const p of all[s]) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
  }
  return { minX, maxX, minY, maxY };
}

function preservedComments(svgText: string): string[] {
  return (svgText.match(/<!--[\s\S]*?-->/g) ?? []).filter(
    (c) => !c.includes('Generator: Adobe Illustrator'),
  );
}

function viewBoxOf(svgText: string): number[] {
  const m = /viewBox="([^"]+)"/.exec(svgText);
  return m ? m[1].trim().split(/[\s,]+/).map(Number) : [0, 0, 0, 0];
}

function normalizeFile(file: string, spec: FactorSpec): void {
  const inputPath = file.includes('/') ? file : join(LATHE_DIR, file);
  const svgText = readFileSync(inputPath, 'utf8');
  const elements = readSlotElements(svgText);
  const slotsPresent = [...new Set(elements.flatMap((e) => (e.slot === null ? [] : [e.slot])))];
  const b = boundsOf(svgText, slotsPresent);

  let affine: Affine;
  let width: number;
  let height: number;
  if (spec.kind === 'identity') {
    affine = { sx: 1, sy: 1, tx: 0, ty: 0 };
    const vb = viewBoxOf(svgText);
    width = vb[2];
    height = vb[3];
  } else {
    const sx = spec.kind === 'uniform' ? spec.s : spec.sx;
    const sy = spec.kind === 'uniform' ? spec.s : spec.sy;
    // Axis (x = 0) stays at x = 0; top-most geometry moves to y = 0.
    affine = { sx, sy, tx: 0, ty: -b.minY * sy };
    width = spec.kind === 'uniform' ? Math.max(viewBoxOf(svgText)[2], b.maxX) * sx : b.maxX * sx;
    height = (b.maxY - b.minY) * sy;
  }

  const lines: string[] = [];
  for (const el of elements) {
    const d = transformPathData(el.d, affine);
    if (el.slot !== null) {
      const cls = LATHE_PATH_SLOT_CLASSES[el.slot];
      const stroke = LATHE_PATH_SLOT_STROKES[el.slot];
      lines.push(`  <path class="${cls}" stroke="${stroke}" fill="none" d="${d}"/>`);
    } else {
      const cls = el.className.length > 0 ? el.className : 'guide';
      lines.push(`  <path class="${cls}" stroke="#cccccc" fill="none" d="${d}"/>`);
    }
  }

  const comments = preservedComments(svgText).map((c) => `  ${c}`);
  const out = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(width)} ${fmt(height)}">`,
    ...comments,
    ...lines,
    '</svg>',
    '',
  ].join('\n');
  writeFileSync(inputPath, out, 'utf8');
  console.log(`${basename(inputPath)}: viewBox 0 0 ${fmt(width)} ${fmt(height)} (${spec.kind})`);
}

/** Factor that maps the current file to its nominal mm size. */
function canSpec(file: string, heightMm: number, radiusMm: number): FactorSpec {
  const svgText = readFileSync(join(LATHE_DIR, file), 'utf8');
  const body = boundsOf(svgText, [0]);
  return {
    kind: 'xy',
    sx: radiusMm / (body.maxX - body.minX),
    sy: heightMm / (body.maxY - body.minY),
  };
}

function bottleSpec(file: string, heightMm: number): FactorSpec {
  const svgText = readFileSync(join(LATHE_DIR, file), 'utf8');
  const wall = boundsOf(svgText, [0]);
  return { kind: 'uniform', s: heightMm / (wall.maxY - wall.minY) };
}

function main(): void {
  const arg = process.argv[2];
  if (arg !== undefined) {
    const s = process.argv.includes('--pt') ? 25.4 / 72 : 1;
    normalizeFile(arg, { kind: 'uniform', s });
    return;
  }
  // Nominal sizes the engine stretched to before (see plan); baked once into the files.
  normalizeFile('lathe-y-can-330ml-classic.svg', canSpec('lathe-y-can-330ml-classic.svg', 115.2, 33));
  normalizeFile('lathe-y-can-330ml-sleek.svg', canSpec('lathe-y-can-330ml-sleek.svg', 146.05, 28.7));
  for (const name of ['bordeaux', 'alsace', 'sparkling']) {
    const file = `lathe-y-bottle-${name}-open.svg`;
    normalizeFile(file, bottleSpec(file, 290));
  }
  normalizeFile('lathe-y-pen-marker.svg', { kind: 'uniform', s: 25.4 / 72 });
  normalizeFile('lathe-y-pen-fountain.svg', { kind: 'identity' });
  normalizeFile('lathe-x-wheel-car.svg', { kind: 'identity' });
}

main();
