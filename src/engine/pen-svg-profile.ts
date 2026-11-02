import { Vector2 } from 'three/webgpu';
import { resolvePenProfile, type PenBodyProfile } from '@/scene/asset-pen';
import { loadProfileSvgText, profileCacheKey } from '@/scene/profile-registry';
import { latheSvgMmToMeters, prepareLatheProfile } from './lathe-contour';
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

/** Keyed by `profileCacheKey` of the resolved profile. */
const rawPathsCache = new Map<string, RawPenPaths>();

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
  return prepareLatheProfile(latheSvgMmToMeters(raw, bounds.maxY));
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

async function loadRawPenPaths(profile: PenBodyProfile): Promise<RawPenPaths> {
  const { entry } = resolvePenProfile(profile);
  const key = profileCacheKey(entry);
  const cached = rawPathsCache.get(key);
  if (cached) {
    return cached;
  }
  const paths = extractPenPathsFromSvgText(await loadProfileSvgText(entry));
  rawPathsCache.set(key, paths);
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
