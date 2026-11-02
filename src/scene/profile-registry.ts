import { builtinProfileUrl } from '@/constants/builtin-profile-paths';
import type { LatheSvgMetricsMm } from '@/engine/lathe-svg-metrics';
import {
  BUILTIN_PROFILES,
  profileMetrics,
  type ProfileEntry,
} from './profile-library';
import { profileToSvg } from './profile-model';

/**
 * Profiles as seen by scene and engine: built-ins plus the user's profiles, which the UI
 * store pushes in. Assets reference profiles by id and resolve them here.
 */

type ProfilesListener = (changedIds: ReadonlySet<string>) => void;

let userProfiles: readonly ProfileEntry[] = [];
const versions = new Map<string, number>();
const listeners = new Set<ProfilesListener>();

/** Older scenes stored short profile names per asset. */
const LEGACY_PROFILE_IDS: Readonly<Record<string, string>> = {
  bordeaux: 'bottle-bordeaux',
  alsace: 'bottle-alsace',
  sparkling: 'bottle-sparkling',
  standard: 'can-330-classic',
  sleek: 'can-330-sleek',
  marker: 'pen-marker',
  fountain: 'pen-fountain',
};

export function canonicalProfileId(id: string): string {
  return LEGACY_PROFILE_IDS[id] ?? id;
}

export function allRegisteredProfiles(): ProfileEntry[] {
  return [...BUILTIN_PROFILES, ...userProfiles];
}

export function findProfile(id: string): ProfileEntry | undefined {
  const canonical = canonicalProfileId(id);
  return BUILTIN_PROFILES.find((entry) => entry.id === canonical)
    ?? userProfiles.find((entry) => entry.id === canonical);
}

/** Changes whenever a user profile is edited; part of geometry cache keys. */
export function profileVersion(id: string): number {
  return versions.get(canonicalProfileId(id)) ?? 0;
}

/** Replaces the user profiles; listeners hear which ids changed, were added or removed. */
export function setRegisteredUserProfiles(next: readonly ProfileEntry[]): void {
  if (next === userProfiles) {return;}
  const before = new Map(userProfiles.map((entry) => [entry.id, entry]));
  const changed = new Set<string>();
  for (const entry of next) {
    if (before.get(entry.id) !== entry) {changed.add(entry.id);}
    before.delete(entry.id);
  }
  for (const id of before.keys()) {changed.add(id);}
  userProfiles = next;
  if (changed.size === 0) {return;}
  for (const id of changed) {versions.set(id, (versions.get(id) ?? 0) + 1);}
  listeners.forEach((listener) => { listener(changed); });
}

export function subscribeProfiles(listener: ProfilesListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function registeredProfileMetrics(entry: ProfileEntry): LatheSvgMetricsMm | undefined {
  return profileMetrics(entry);
}

/** SVG text of a profile: the shipped file for built-ins, generated for user profiles. */
export async function loadProfileSvgText(entry: ProfileEntry, noCache = false): Promise<string> {
  if (!entry.file) {
    return profileToSvg(entry);
  }
  const url = builtinProfileUrl(entry.dir ?? 'lathe', entry.file);
  const response = await fetch(url, noCache ? { cache: 'no-store' } : undefined);
  if (!response.ok) {
    throw new Error(`Failed to load SVG: ${url} (${response.status})`);
  }
  return response.text();
}

export interface ResolvedAssetProfile {
  entry: ProfileEntry;
  /** True when the requested profile is gone or lacks a required path (fallback used). */
  missing: boolean;
}

/**
 * Profile an asset uses: the requested one if it has all `requiredSlots`,
 * otherwise the built-in `fallbackId`.
 */
export function resolveAssetProfile(
  id: string,
  requiredSlots: readonly number[],
  fallbackId: string,
): ResolvedAssetProfile {
  const entry = findProfile(id);
  const slots = entry ? registeredProfileMetrics(entry)?.slots : undefined;
  if (entry && slots && requiredSlots.every((slot) => slots[slot])) {
    return { entry, missing: false };
  }
  const fallback = findProfile(fallbackId);
  if (!fallback) {
    throw new Error(`Built-in profile ${fallbackId} missing`);
  }
  return { entry: fallback, missing: true };
}

/** Cache key for geometry built from a profile: id plus edit version. */
export function profileCacheKey(entry: ProfileEntry): string {
  return `${entry.id}@${profileVersion(entry.id)}`;
}
