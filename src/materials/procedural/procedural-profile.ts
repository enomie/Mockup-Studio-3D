import type { ProceduralProfileId } from '@/scene/material-types';

/** @deprecated Renamed to wood-soft — kept for user-duplicated presets. */
const LEGACY_WOOD_MAHOGANY = 'wood-mahogany';

export function normalizeProceduralProfile(
  profile: ProceduralProfileId | string,
): ProceduralProfileId {
  if (profile === LEGACY_WOOD_MAHOGANY) return 'wood-soft';
  return profile as ProceduralProfileId;
}
