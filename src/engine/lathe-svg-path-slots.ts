import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

export interface LatheSvgPoint2 {
  x: number;
  y: number;
}

export type LathePathSlot = 0 | 1 | 2;

const CLASS_TO_SLOT: Record<string, LathePathSlot> = {
  path_red: 0,
  path_green: 1,
  path_blue: 2,
};

const STROKE_TO_SLOT: Record<string, LathePathSlot> = {
  '#ff0000': 0,
  '#00ff00': 1,
  '#0000ff': 2,
};

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

/** CSS rules `.path_red { stroke: #f00 }` etc. */
export function parseLathePathClassStrokeMap(svgText: string): Map<string, string> {
  const map = new Map<string, string>();
  const ruleRe =
    /\.(path_red|path_green|path_blue)\s*\{[^}]*stroke:\s*(#[0-9a-fA-F]{3,8})/gi;
  let match: RegExpExecArray | null;
  while ((match = ruleRe.exec(svgText)) !== null) {
    const normalized = normalizeLatheStrokeHex(match[2]);
    if (normalized) {
      map.set(match[1], normalized);
    }
  }
  return map;
}

export function lathePathSlotForSvgPath(
  path: LatheSvgPathLike,
  classStroke: Map<string, string>,
): LathePathSlot | null {
  const node = path.userData?.node;
  const classAttr = node?.getAttribute('class') ?? '';
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

  const inline = pathStrokeHex(path);
  if (inline !== null && inline in STROKE_TO_SLOT) {
    return STROKE_TO_SLOT[inline];
  }

  return null;
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
  const slots: LatheSvgPoint2[][] = [[], [], []];
  const filled: boolean[] = [false, false, false];

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
