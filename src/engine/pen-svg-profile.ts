import { Vector2 } from 'three/webgpu';
import { penSvgUrl, type PenBodyProfile } from '@/scene/asset-pen';
import { MM_TO_M } from '@/units/length';
import { orientLatheProfileBottomToTop } from './beverage-can-svg-profile';
import {
  extractLathePathPointsBySlot,
  type LatheSvgPoint2,
} from './lathe-svg-path-slots';

;

type PenSvgPartId = 'cap' | 'ring' | 'body';

export interface PenLatheProfiles {
  cap: Vector2[];
  ring: Vector2[];
  body: Vector2[];
}

type RawPenPaths = Record<PenSvgPartId, LatheSvgPoint2[]>;

const rawPathsCache = new Map<PenBodyProfile, RawPenPaths>();

export function extractPenPathsFromSvgText(
  svgText: string,
  curveSegments = 24,
): RawPenPaths {
  const slots = extractLathePathPointsBySlot(svgText, curveSegments);
  return {
    cap: slots[0],
    ring: slots[1],
    body: slots[2],
  };
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

function normalizePenPartPoints(
  raw: LatheSvgPoint2[],
  bounds: { maxY: number },
): Vector2[] {
  if (raw.length < 2) {
    return [];
  }

  const normalized: Vector2[] = [];
  for (const p of raw) {
    const x = p.x * MM_TO_M;
    const y = (bounds.maxY - p.y) * MM_TO_M;
    normalized.push(new Vector2(x, y));
  }

  return orientLatheProfileBottomToTop(normalized);
}

function scalePenLatheProfiles(
  profiles: PenLatheProfiles,
  sizeScale: number,
): PenLatheProfiles {
  if (sizeScale === 1) {
    return profiles;
  }
  const scalePart = (points: Vector2[]): Vector2[] =>
    points.map((p) => new Vector2(p.x * sizeScale, p.y * sizeScale));

  return {
    cap: scalePart(profiles.cap),
    ring: scalePart(profiles.ring),
    body: scalePart(profiles.body),
  };
}

export function normalizePenPaths(raw: RawPenPaths): PenLatheProfiles {
  const bounds = globalBoundsFromRawPaths(raw);
  return {
    cap: normalizePenPartPoints(raw.cap, bounds),
    ring: normalizePenPartPoints(raw.ring, bounds),
    body: normalizePenPartPoints(raw.body, bounds),
  };
}

async function fetchSvgText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load SVG: ${url} (${response.status})`);
  }
  return response.text();
}

async function loadRawPenPaths(profile: PenBodyProfile): Promise<RawPenPaths> {
  const cached = rawPathsCache.get(profile);
  if (cached) {
    return cached;
  }
  const svgText = await fetchSvgText(penSvgUrl(profile));
  const paths = extractPenPathsFromSvgText(svgText);
  rawPathsCache.set(profile, paths);
  return paths;
}

export async function loadPenLatheProfiles(
  profile: PenBodyProfile,
  sizeScale = 1,
): Promise<PenLatheProfiles> {
  const raw = await loadRawPenPaths(profile);
  const normalized = normalizePenPaths(raw);
  return scalePenLatheProfiles(normalized, sizeScale);
}
