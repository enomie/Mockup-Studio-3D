import { builtinProfileUrl, type BuiltinProfileDir } from '@/constants/builtin-profile-paths';
import { BUILTIN_PROFILE_PATHS } from '@/data/builtin-profiles.generated';
import { LATHE_PROFILE_METRICS_MM } from '@/data/lathe-profile-metrics.generated';
import { BUILTIN_PROFILE_FILES } from './builtin-profile-files';
import { measureLatheSvgMm, type LatheSvgMetricsMm } from '@/engine/lathe-svg-metrics';
import { profileToSvg, type Profile, type ProfilePath } from './profile-model';

export { builtinProfileFile, type BuiltinProfileId } from './builtin-profile-files';

/** Library entry: editable profile data plus where a built-in one comes from. */
export interface ProfileEntry extends Profile {
  /** Shipped SVG file (built-ins only), under `public/profiles/<dir>/`. */
  file?: string;
  dir?: BuiltinProfileDir;
  /** Asset type that ships with this profile (built-ins only). */
  usedBy?: string;
}

function builtinPaths(id: string): ProfilePath[] {
  const paths = BUILTIN_PROFILE_PATHS[id] as ProfilePath[] | undefined;
  if (!paths) {
    throw new Error(`Missing generated paths for built-in profile ${id}`);
  }
  return paths;
}

export interface BuiltinProfileEntry extends ProfileEntry {
  source: 'builtin';
  file: string;
  dir: BuiltinProfileDir;
  usedBy: string;
}

export const BUILTIN_PROFILES: readonly BuiltinProfileEntry[] = BUILTIN_PROFILE_FILES.map((entry) => ({
  ...entry,
  source: 'builtin' as const,
  paths: builtinPaths(entry.id),
}));

/** Built-ins first, then the user's profiles. */
export function allProfiles(userProfiles: readonly ProfileEntry[]): ProfileEntry[] {
  return [...BUILTIN_PROFILES, ...userProfiles];
}

export function getProfile(
  id: string,
  userProfiles: readonly ProfileEntry[] = [],
): ProfileEntry | undefined {
  return allProfiles(userProfiles).find((entry) => entry.id === id);
}

const svgCache = new WeakMap<Profile, string>();
const metricsCache = new WeakMap<Profile, LatheSvgMetricsMm | null>();

function cachedSvg(entry: Profile): string {
  let svg = svgCache.get(entry);
  if (svg === undefined) {
    svg = profileToSvg(entry);
    svgCache.set(entry, svg);
  }
  return svg;
}

/** Image URL for thumbnails: the shipped SVG for built-ins, generated SVG for user profiles. */
export function profileUrl(entry: ProfileEntry): string {
  if (entry.file) {
    return builtinProfileUrl(entry.dir ?? 'lathe', entry.file);
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cachedSvg(entry))}`;
}

export function profileMetrics(entry: ProfileEntry): LatheSvgMetricsMm | undefined {
  const generated = entry.file ? (LATHE_PROFILE_METRICS_MM[entry.file] as LatheSvgMetricsMm | undefined) : undefined;
  if (generated) {
    return generated;
  }
  let metrics = metricsCache.get(entry);
  if (metrics === undefined) {
    try {
      metrics = measureLatheSvgMm(cachedSvg(entry));
    } catch {
      metrics = null;
    }
    metricsCache.set(entry, metrics);
  }
  return metrics ?? undefined;
}

const formatMm = (value: number): string => String(Math.round(value));

/** Bounding size as "W × H mm" (width of the half profile, not the revolved diameter). */
export function profileSizeLabel(entry: ProfileEntry): string | null {
  const metrics = profileMetrics(entry);
  if (!metrics) {
    return null;
  }
  const { minX, maxX, minY, maxY } = metrics.bounds;
  return `${formatMm(maxX - minX)} × ${formatMm(maxY - minY)} mm`;
}
