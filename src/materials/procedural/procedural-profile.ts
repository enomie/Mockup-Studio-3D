import type { ProceduralProfileId } from '@/scene/material-types';

/** Load migration: wood-mahogany → wood-soft (user-duplicated presets). */
const LEGACY_WOOD_MAHOGANY = 'wood-mahogany';

export function normalizeProceduralProfile(profile: string): ProceduralProfileId {
  if (profile === LEGACY_WOOD_MAHOGANY) {return 'wood-soft';}
  return profile as ProceduralProfileId;
}
