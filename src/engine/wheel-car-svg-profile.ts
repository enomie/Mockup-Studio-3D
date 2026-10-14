import { Vector2 } from 'three/webgpu';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { builtinLatheProfileUrl } from '@/constants/builtin-profile-paths';
import {
  WHEEL_CAR_SVG_AXIS_Y_MM,
  WHEEL_CAR_SVG_AXIAL_CENTER_MM,
  wheelCarUniformScale,
} from '@/scene/asset-wheel-car';

export interface SvgPoint2 { x: number; y: number }

export type WheelCarSvgPartId = 'tire' | 'rimOuter' | 'rimInner';

const STROKE_TO_PART: Record<string, WheelCarSvgPartId> = {
  '#000000': 'tire',
  '#ff0000': 'rimOuter',
  '#0000ff': 'rimInner',
};

const CLASS_TOKEN_TO_PART: Record<string, WheelCarSvgPartId> = {
  tire: 'tire',
  'rim-outer': 'rimOuter',
  'rim-inner': 'rimInner',
};

export interface WheelCarLatheProfiles {
  tire: Vector2[];
  rimOuter: Vector2[];
  rimInner: Vector2[];
}

type RawWheelCarPaths = Record<WheelCarSvgPartId, SvgPoint2[]>;

let rawPathsCache: RawWheelCarPaths | null = null;

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
  const ruleRe = /\.([\w-]+)\s*\{[^}]*stroke:\s*(#[0-9a-fA-F]{3,8})/gi;
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
): WheelCarSvgPartId | undefined {
  const node = path.userData?.node;
  const classAttr = node?.getAttribute('class') ?? '';
  for (const token of classAttr.split(/\s+/)) {
    if (token in CLASS_TOKEN_TO_PART) {
      return CLASS_TOKEN_TO_PART[token];
    }
    const hex = classStroke.get(token);
    if (hex !== undefined && hex in STROKE_TO_PART) {
      return STROKE_TO_PART[hex];
    }
  }

  const inline = pathStrokeHex(path);
  if (inline !== null && inline in STROKE_TO_PART) {
    return STROKE_TO_PART[inline];
  }

  return undefined;
}

export function extractWheelCarPathsFromSvgText(
  svgText: string,
  curveSegments = 32,
): RawWheelCarPaths {
  const loader = new SVGLoader();
  const data = loader.parse(svgText);
  const classStroke = parseClassStrokeMap(svgText);
  const result: RawWheelCarPaths = { tire: [], rimOuter: [], rimInner: [] };

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

/** SVG mm → Lathe profile (x = radius, y = axial) in meters, uniform scale from outer radius. */
export function normalizeWheelCarPartPoints(
  raw: SvgPoint2[],
  outerRadiusM: number,
): Vector2[] {
  if (raw.length < 3 || outerRadiusM <= 0) {
    return [];
  }

  const scale = wheelCarUniformScale(outerRadiusM);
  const mPerMm = scale / 1000;
  const normalized: Vector2[] = [];

  for (const p of raw) {
    const radiusM = (WHEEL_CAR_SVG_AXIS_Y_MM - p.y) * mPerMm;
    const axialM = (p.x - WHEEL_CAR_SVG_AXIAL_CENTER_MM) * mPerMm;
    normalized.push(new Vector2(radiusM, axialM));
  }

  return normalized;
}

export function normalizeWheelCarPaths(
  raw: RawWheelCarPaths,
  outerRadiusM: number,
): WheelCarLatheProfiles {
  return {
    tire: normalizeWheelCarPartPoints(raw.tire, outerRadiusM),
    rimOuter: normalizeWheelCarPartPoints(raw.rimOuter, outerRadiusM),
    rimInner: normalizeWheelCarPartPoints(raw.rimInner, outerRadiusM),
  };
}

export function wheelCarSvgUrl(): string {
  return builtinLatheProfileUrl('wheel-car.svg');
}

export async function fetchSvgText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load SVG: ${url} (${response.status})`);
  }
  return response.text();
}

export async function loadRawWheelCarPaths(): Promise<RawWheelCarPaths> {
  if (rawPathsCache) {
    return rawPathsCache;
  }
  const svgText = await fetchSvgText(wheelCarSvgUrl());
  const paths = extractWheelCarPathsFromSvgText(svgText);
  rawPathsCache = paths;
  return paths;
}

export function setRawWheelCarPathsCache(paths: RawWheelCarPaths): void {
  rawPathsCache = paths;
}

export function clearRawWheelCarPathsCache(): void {
  rawPathsCache = null;
}

export async function loadWheelCarLatheProfiles(
  outerRadiusM: number,
): Promise<WheelCarLatheProfiles> {
  const raw = await loadRawWheelCarPaths();
  return normalizeWheelCarPaths(raw, outerRadiusM);
}

export function maxRadiusFromLatheProfile(points: Vector2[]): number {
  let maxR = 0;
  for (const p of points) {
    maxR = Math.max(maxR, p.x);
  }
  return maxR;
}

/** Lathe profile uses x = radius, y = axial (meters). */
export function latheProfileBandBounds(points: Vector2[]): {
  minRadiusM: number;
  maxRadiusM: number;
  minAxialM: number;
  maxAxialM: number;
} {
  let minRadiusM = Infinity;
  let maxRadiusM = -Infinity;
  let minAxialM = Infinity;
  let maxAxialM = -Infinity;
  for (const p of points) {
    minRadiusM = Math.min(minRadiusM, p.x);
    maxRadiusM = Math.max(maxRadiusM, p.x);
    minAxialM = Math.min(minAxialM, p.y);
    maxAxialM = Math.max(maxAxialM, p.y);
  }
  return { minRadiusM, maxRadiusM, minAxialM, maxAxialM };
}
