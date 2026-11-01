import { builtinLatheProfileUrl } from '@/constants/builtin-profile-paths';
import { LATHE_PROFILE_METRICS_MM } from '@/data/lathe-profile-metrics.generated';
import type { LatheSvgMetricsMm } from '@/engine/lathe-svg-metrics';

/**
 * A profile is a neutral set of 2D paths. The asset that uses it decides whether it is
 * revolved or extruded (and around which axis), so profiles carry no kind.
 */
export interface ProfileEntry {
  id: string;
  name: string;
  source: 'builtin' | 'user';
  /** SVG file name under `public/profiles/lathe/` (1 unit = 1 mm). */
  file: string;
  /** Asset type that ships with this profile. */
  usedBy: string;
}

export const BUILTIN_PROFILES = [
  { id: 'bottle-bordeaux', name: 'Bordeaux bottle', source: 'builtin', file: 'lathe-y-bottle-bordeaux-open.svg', usedBy: 'Wine bottle' },
  { id: 'bottle-alsace', name: 'Alsace bottle', source: 'builtin', file: 'lathe-y-bottle-alsace-open.svg', usedBy: 'Wine bottle' },
  { id: 'bottle-sparkling', name: 'Sparkling bottle', source: 'builtin', file: 'lathe-y-bottle-sparkling-open.svg', usedBy: 'Wine bottle' },
  { id: 'can-330-classic', name: 'Can 330 ml classic', source: 'builtin', file: 'lathe-y-can-330ml-classic.svg', usedBy: 'Beverage can' },
  { id: 'can-330-sleek', name: 'Can 330 ml sleek', source: 'builtin', file: 'lathe-y-can-330ml-sleek.svg', usedBy: 'Beverage can' },
  { id: 'pen-marker', name: 'Marker pen', source: 'builtin', file: 'lathe-y-pen-marker.svg', usedBy: 'Pen' },
  { id: 'pen-fountain', name: 'Fountain pen', source: 'builtin', file: 'lathe-y-pen-fountain.svg', usedBy: 'Pen' },
  { id: 'wheel-car', name: 'Car wheel', source: 'builtin', file: 'lathe-x-wheel-car.svg', usedBy: 'Wheel car' },
] as const satisfies readonly ProfileEntry[];

export type BuiltinProfileId = (typeof BUILTIN_PROFILES)[number]['id'];

export function getProfile(id: string): ProfileEntry | undefined {
  return BUILTIN_PROFILES.find((entry) => entry.id === id);
}

/** SVG file name of a built-in profile. */
export function builtinProfileFile(id: BuiltinProfileId): string {
  const entry = BUILTIN_PROFILES.find((profile) => profile.id === id);
  if (!entry) {
    throw new Error(`Unknown built-in profile: ${id}`);
  }
  return entry.file;
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
