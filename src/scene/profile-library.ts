import { builtinLatheProfileUrl } from '@/constants/builtin-profile-paths';
import { BUILTIN_PROFILE_PATHS } from '@/data/builtin-profiles.generated';
import { LATHE_PROFILE_METRICS_MM } from '@/data/lathe-profile-metrics.generated';
import type { LatheSvgMetricsMm } from '@/engine/lathe-svg-metrics';
import { BUILTIN_PROFILE_FILES } from './builtin-profile-files';
import type { Profile, ProfilePath } from './profile-model';

export { builtinProfileFile, type BuiltinProfileId } from './builtin-profile-files';

/** Library entry: editable profile data plus where a built-in one comes from. */
export interface ProfileEntry extends Profile {
  /** Shipped SVG file (built-ins only), under `public/profiles/lathe/`. */
  file: string;
  /** Asset type that ships with this profile. */
  usedBy: string;
}

function builtinPaths(id: string): ProfilePath[] {
  const paths = BUILTIN_PROFILE_PATHS[id] as ProfilePath[] | undefined;
  if (!paths) {
    throw new Error(`Missing generated paths for built-in profile ${id}`);
  }
  return paths;
}

export const BUILTIN_PROFILES: readonly ProfileEntry[] = BUILTIN_PROFILE_FILES.map((entry) => ({
  ...entry,
  source: 'builtin' as const,
  paths: builtinPaths(entry.id),
}));

export function getProfile(id: string): ProfileEntry | undefined {
  return BUILTIN_PROFILES.find((entry) => entry.id === id);
}

export function profileUrl(entry: ProfileEntry): string {
  return builtinLatheProfileUrl(entry.file);
}

export function profileMetrics(entry: ProfileEntry): LatheSvgMetricsMm | undefined {
  return LATHE_PROFILE_METRICS_MM[entry.file];
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
