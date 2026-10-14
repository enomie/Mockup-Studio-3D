import type { ProceduralProfileId } from '@/scene/material-types';
import { normalizeProceduralProfile } from './procedural-profile';
import type { ProceduralSurfaceRole } from './procedural-types';

const FRAME_UV_PROFILES: ReadonlySet<ProceduralProfileId> = new Set([
  'wood-soft',
  'wood-porous',
  'metal-polished',
  'metal-brushed',
]);

const WOOD_PROFILES: ReadonlySet<ProceduralProfileId> = new Set(['wood-soft', 'wood-porous']);

const CONCRETE_POROUS_PROFILES: ReadonlySet<ProceduralProfileId> = new Set(['concrete-porous']);

const METER_3D_PROFILES: ReadonlySet<ProceduralProfileId> = new Set([
  'metal-polished',
  'metal-brushed',
  'fabric-linen',
  'silk-fine',
  'concrete-stained',
  'paper-grain',
  'coated-gloss',
  'plastic-matte',
  'plastic-smooth',
  'glass-surface',
]);

export function isGridPaperProfile(profile: ProceduralProfileId | undefined): boolean {
  return profile === 'grid-paper-opaque' || profile === 'grid-paper-lines';
}

export function resolveProfileSamplingSpace(
  profile: ProceduralProfileId | undefined,
  surfaceRole: ProceduralSurfaceRole,
): 'uv' | 'planar-meters' | 'triplanar-meters' | 'meter-3d' {
  const resolved = profile ? normalizeProceduralProfile(profile) : undefined;
  if (!resolved) {
    return surfaceRole === 'frame' ? 'uv' : surfaceRole === 'ground' ? 'planar-meters' : 'uv';
  }

  if (isGridPaperProfile(resolved)) {
    if (surfaceRole === 'ground') {return 'planar-meters';}
    return 'triplanar-meters';
  }

  if (WOOD_PROFILES.has(resolved)) {
    if (surfaceRole === 'frame') {return 'uv';}
    if (surfaceRole === 'ground') {return 'planar-meters';}
    return 'triplanar-meters';
  }

  if (CONCRETE_POROUS_PROFILES.has(resolved)) {
    if (surfaceRole === 'ground') {return 'planar-meters';}
    if (surfaceRole === 'frame') {return 'planar-meters';}
    return 'triplanar-meters';
  }

  if (resolved === 'paper-grain') {
    if (surfaceRole === 'frame') {return 'planar-meters';}
    return 'meter-3d';
  }

  if (METER_3D_PROFILES.has(resolved)) {
    if (surfaceRole === 'frame' && FRAME_UV_PROFILES.has(resolved)) {
      return 'uv';
    }
    if (surfaceRole === 'frame') {
      return 'planar-meters';
    }
    return 'meter-3d';
  }

  if (surfaceRole === 'frame') {return 'uv';}
  if (surfaceRole === 'ground') {return 'planar-meters';}
  return 'uv';
}
