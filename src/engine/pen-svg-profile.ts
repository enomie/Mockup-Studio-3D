import { Vector2 } from 'three/webgpu';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { penSvgUrl, type PenBodyProfile } from '@/scene/asset-pen';
import { orientLatheProfileBottomToTop } from './beverage-can-svg-profile';

export interface SvgPoint2 { x: number; y: number }

export type PenSvgPartId = 'cap' | 'ring' | 'body';

const STROKE_TO_PART: Record<string, PenSvgPartId> = {
  '#ff0000': 'cap',
  '#00ff00': 'ring',
  '#0000ff': 'body',
};

export interface PenLatheProfiles {
  cap: Vector2[];
  ring: Vector2[];
  body: Vector2[];
}

type RawPenPaths = Record<PenSvgPartId, SvgPoint2[]>;

const rawPathsCache = new Map<PenBodyProfile, RawPenPaths>();

function normalizeStrokeHex(stroke: string | undefined): string | null {
  if (!stroke) {
    return null;
  }
  const trimmed = stroke.trim().toLowerCase();
  if (trimmed.startsWith('#')) {
    return trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed;
  }
  return null;
}

function pathStrokeHex(path: {
  userData?: { style?: { stroke?: string }; node?: Element };
  color?: { getHexString?: () => string };
}): string | null {
  const stroke = path.userData?.style?.stroke;
  const fromStyle = normalizeStrokeHex(typeof stroke === 'string' ? stroke : undefined);
  if (fromStyle) {
    return fromStyle;
  }
  const hex = path.color?.getHexString?.();
  if (hex) {
    return normalizeStrokeHex(`#${hex}`);
  }
  return null;
}

function parseClassStrokeMap(svgText: string): Map<string, string> {
  const map = new Map<string, string>();
  const ruleRe = /\.(cls-\d+)\s*\{[^}]*stroke:\s*(#[0-9a-fA-F]{3,8})/gi;
  let match: RegExpExecArray | null;
  while ((match = ruleRe.exec(svgText)) !== null) {
    const normalized = normalizeStrokeHex(match[2]);
    if (normalized) {
      map.set(match[1], normalized);
    }
  }
  return map;
}

function partIdForPath(
  path: { userData?: { node?: Element }; color?: { getHexString?: () => string } },
  classStroke: Map<string, string>,
): PenSvgPartId | undefined {
  const inline = pathStrokeHex(path);
  if (inline !== null && inline in STROKE_TO_PART) {
    return STROKE_TO_PART[inline];
  }

  const node = path.userData?.node;
  const classAttr = node?.getAttribute('class') ?? '';
  for (const token of classAttr.split(/\s+/)) {
    const hex = classStroke.get(token);
    if (hex !== undefined && hex in STROKE_TO_PART) {
      return STROKE_TO_PART[hex];
    }
  }

  return undefined;
}

export function extractPenPathsFromSvgText(
  svgText: string,
  curveSegments = 24,
): RawPenPaths {
  const loader = new SVGLoader();
  const data = loader.parse(svgText);
  const classStroke = parseClassStrokeMap(svgText);
  const result: RawPenPaths = { cap: [], ring: [], body: [] };

  for (const path of data.paths) {
    const part = partIdForPath(path, classStroke);
    if (!part) {
      continue;
    }
    const shapes = path.toShapes();
    const shape = shapes.at(0);
    if (shape === undefined) {
      continue;
    }
    const points = shape.getPoints(curveSegments).map((p) => ({ x: p.x, y: p.y }));
    if (points.length > 0) {
      result[part] = points;
    }
  }

  return result;
}

export function globalBoundsFromRawPaths(paths: RawPenPaths): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const part of Object.values(paths)) {
    for (const p of part) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }

  return { minX, maxX, minY, maxY };
}

export function normalizePenPartPoints(
  raw: SvgPoint2[],
  bounds: { maxX: number; maxY: number },
  maxRadiusM: number,
): Vector2[] {
  if (raw.length < 2 || bounds.maxX <= 0 || maxRadiusM <= 0) {
    return [];
  }

  const scale = maxRadiusM / bounds.maxX;
  const normalized: Vector2[] = [];
  for (const p of raw) {
    const x = p.x * scale;
    const y = (bounds.maxY - p.y) * scale;
    normalized.push(new Vector2(x, y));
  }

  return orientLatheProfileBottomToTop(normalized);
}

export function normalizePenPaths(
  raw: RawPenPaths,
  maxRadiusM: number,
): PenLatheProfiles {
  const bounds = globalBoundsFromRawPaths(raw);
  return {
    cap: normalizePenPartPoints(raw.cap, bounds, maxRadiusM),
    ring: normalizePenPartPoints(raw.ring, bounds, maxRadiusM),
    body: normalizePenPartPoints(raw.body, bounds, maxRadiusM),
  };
}

export async function fetchSvgText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load SVG: ${url} (${response.status})`);
  }
  return response.text();
}

export async function loadRawPenPaths(profile: PenBodyProfile): Promise<RawPenPaths> {
  const cached = rawPathsCache.get(profile);
  if (cached) {
    return cached;
  }
  const svgText = await fetchSvgText(penSvgUrl(profile));
  const paths = extractPenPathsFromSvgText(svgText);
  rawPathsCache.set(profile, paths);
  return paths;
}

export function setRawPenPathsCache(profile: PenBodyProfile, paths: RawPenPaths): void {
  rawPathsCache.set(profile, paths);
}

export function clearRawPenPathsCache(): void {
  rawPathsCache.clear();
}

export async function loadPenLatheProfiles(
  profile: PenBodyProfile,
  maxRadiusM: number,
): Promise<PenLatheProfiles> {
  const raw = await loadRawPenPaths(profile);
  return normalizePenPaths(raw, maxRadiusM);
}
