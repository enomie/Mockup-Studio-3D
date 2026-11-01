import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

export interface LatheSvgPoint2 {
  x: number;
  y: number;
}

/** Up to 10 geometry paths per lathe SVG, identified by stroke color. */
const LATHE_PATH_SLOT_COUNT = 10;

export type LathePathSlot = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const SLOT_DEFS: readonly { className: string; stroke: string; aliases: readonly string[] }[] = [
  { className: 'path_red', stroke: '#ff0000', aliases: ['red'] },
  { className: 'path_green', stroke: '#00ff00', aliases: ['lime'] },
  { className: 'path_blue', stroke: '#0000ff', aliases: ['blue'] },
  { className: 'path_magenta', stroke: '#ff00ff', aliases: ['magenta', 'fuchsia'] },
  { className: 'path_cyan', stroke: '#00ffff', aliases: ['cyan', 'aqua'] },
  { className: 'path_yellow', stroke: '#ffff00', aliases: ['yellow'] },
  // Illustrator writes CSS keywords: orange = #ffa500, purple = #800080 → same slots.
  { className: 'path_orange', stroke: '#ff8000', aliases: ['orange', '#ffa500'] },
  { className: 'path_purple', stroke: '#8000ff', aliases: ['purple', '#800080'] },
  { className: 'path_teal', stroke: '#008080', aliases: ['teal'] },
  { className: 'path_brown', stroke: '#804000', aliases: ['brown', '#a52a2a'] },
];

/** Canonical class per slot (shipped SVG convention). */
export const LATHE_PATH_SLOT_CLASSES = SLOT_DEFS.map((d) => d.className) as readonly string[];

/** Canonical stroke per slot (shipped SVG convention). */
export const LATHE_PATH_SLOT_STROKES = SLOT_DEFS.map((d) => d.stroke) as readonly string[];

/** CSS color keywords that Illustrator exports for the slot colors. */
const NAMED_STROKE_HEX: Record<string, string> = Object.fromEntries(
  SLOT_DEFS.flatMap((d) =>
    d.aliases.filter((a) => !a.startsWith('#')).map((a): [string, string] => [a, d.stroke]),
  ),
);

const CLASS_TO_SLOT: Record<string, LathePathSlot> = Object.fromEntries(
  SLOT_DEFS.map((d, i) => [d.className, i as LathePathSlot]),
);

const STROKE_TO_SLOT: Record<string, LathePathSlot> = Object.fromEntries(
  SLOT_DEFS.flatMap((d, i): [string, LathePathSlot][] => [
    [d.stroke, i as LathePathSlot],
    ...d.aliases
      .filter((a) => a.startsWith('#'))
      .map((a): [string, LathePathSlot] => [a, i as LathePathSlot]),
  ]),
);

export interface LatheSvgPathLike {
  userData?: { style?: { stroke?: string }; node?: Element };
  color?: { getHexString?: () => string };
  subPaths: { getPoints: (n: number) => { x: number; y: number }[] }[];
  toShapes: () => { getPoints: (n: number) => { x: number; y: number }[] }[];
}

function normalizeLatheStrokeHex(stroke: string | undefined): string | null {
  if (!stroke) {
    return null;
  }
  const trimmed = stroke.trim().toLowerCase();
  if (trimmed in NAMED_STROKE_HEX) {
    return NAMED_STROKE_HEX[trimmed];
  }
  if (!trimmed.startsWith('#')) {
    return null;
  }
  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return trimmed;
}

function pathStrokeHex(path: LatheSvgPathLike): string | null {
  const stroke = path.userData?.style?.stroke;
  const fromStyle = normalizeLatheStrokeHex(typeof stroke === 'string' ? stroke : undefined);
  if (fromStyle) {
    return fromStyle;
  }
  const hex = path.color?.getHexString?.();
  if (hex) {
    return normalizeLatheStrokeHex(`#${hex}`);
  }
  return null;
}

/** CSS rules `.path_red { stroke: #f00 }`, `.cls-1 { stroke: lime }` etc. (Illustrator exports). */
export function parseLathePathClassStrokeMap(svgText: string): Map<string, string> {
  const map = new Map<string, string>();
  const ruleRe = /\.([\w-]+)\s*\{[^}]*?stroke:\s*(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\s*[;}]/gi;
  let match: RegExpExecArray | null;
  while ((match = ruleRe.exec(svgText)) !== null) {
    const normalized = normalizeLatheStrokeHex(match[2]);
    if (normalized) {
      map.set(match[1], normalized);
    }
  }
  return map;
}

function slotFromClassTokens(
  classAttr: string,
  classStroke: Map<string, string>,
): LathePathSlot | null {
  for (const token of classAttr.split(/\s+/)) {
    if (token.length === 0) {
      continue;
    }
    if (token in CLASS_TO_SLOT) {
      return CLASS_TO_SLOT[token];
    }
    const hexFromClass = classStroke.get(token);
    if (hexFromClass !== undefined && hexFromClass in STROKE_TO_SLOT) {
      return STROKE_TO_SLOT[hexFromClass];
    }
  }
  return null;
}

function slotFromStroke(stroke: string | null | undefined): LathePathSlot | null {
  const hex = normalizeLatheStrokeHex(stroke ?? undefined);
  return hex !== null && hex in STROKE_TO_SLOT ? STROKE_TO_SLOT[hex] : null;
}

export function lathePathSlotForSvgPath(
  path: LatheSvgPathLike,
  classStroke: Map<string, string>,
): LathePathSlot | null {
  const node = path.userData?.node;
  const fromClass = slotFromClassTokens(node?.getAttribute('class') ?? '', classStroke);
  if (fromClass !== null) {
    return fromClass;
  }
  const inline = pathStrokeHex(path);
  return inline !== null && inline in STROKE_TO_SLOT ? STROKE_TO_SLOT[inline] : null;
}

/** Slot of a raw SVG element (class, then `stroke` attribute, then inline `style`). */
export function lathePathSlotForElement(
  el: Element,
  classStroke: Map<string, string>,
): LathePathSlot | null {
  const fromClass = slotFromClassTokens(el.getAttribute('class') ?? '', classStroke);
  if (fromClass !== null) {
    return fromClass;
  }
  const fromAttr = slotFromStroke(el.getAttribute('stroke'));
  if (fromAttr !== null) {
    return fromAttr;
  }
  const styleStroke = /(?:^|;)\s*stroke\s*:\s*([^;]+)/i.exec(el.getAttribute('style') ?? '');
  return slotFromStroke(styleStroke?.[1]);
}

function tessellatePathFirstShape(
  path: LatheSvgPathLike,
  curveSegments: number,
): LatheSvgPoint2[] {
  const shapes = path.toShapes();
  const shape = shapes.at(0);
  if (shape === undefined) {
    return [];
  }
  return shape.getPoints(curveSegments).map((p) => ({ x: p.x, y: p.y }));
}

/**
 * Strict slot extraction: only paths matching path_red/green/blue class or RGB stroke.
 * First matching path per slot wins.
 */
export function extractLathePathPointsBySlot(
  svgText: string,
  curveSegments = 24,
): LatheSvgPoint2[][] {
  const loader = new SVGLoader();
  const data = loader.parse(svgText);
  const classStroke = parseLathePathClassStrokeMap(svgText);
  const slots: LatheSvgPoint2[][] = Array.from({ length: LATHE_PATH_SLOT_COUNT }, () => []);
  const filled: boolean[] = new Array<boolean>(LATHE_PATH_SLOT_COUNT).fill(false);

  for (const path of data.paths) {
    const slot = lathePathSlotForSvgPath(path, classStroke);
    if (slot === null || filled[slot]) {
      continue;
    }
    const points = tessellatePathFirstShape(path, curveSegments);
    if (points.length > 0) {
      slots[slot] = points;
      filled[slot] = true;
    }
  }

  return slots;
}

/** First subpath only (open wall polylines). Slot must be valid or returns []. */
export function extractLatheSubpathPointsBySlot(
  svgText: string,
  slot: LathePathSlot,
  curveSegments = 48,
): LatheSvgPoint2[] {
  const loader = new SVGLoader();
  const data = loader.parse(svgText);
  const classStroke = parseLathePathClassStrokeMap(svgText);

  for (const path of data.paths) {
    const pathSlot = lathePathSlotForSvgPath(path, classStroke);
    if (pathSlot !== slot) {
      continue;
    }
    const subPath = path.subPaths.at(0);
    if (subPath === undefined) {
      return [];
    }
    return subPath.getPoints(curveSegments).map((p) => ({ x: p.x, y: p.y }));
  }

  return [];
}
