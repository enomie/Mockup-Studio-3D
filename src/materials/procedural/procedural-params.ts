import { multiplyRgb, type Rgb } from '@/colors/rgb';
import {
  TINT_NEUTRAL,
  type MaterialPreset,
  type ProceduralProfileId,
} from '@/scene/material-types';
import { defaultTileScaleForProfile } from '../material-spec';
import {
  DEFAULT_NORMAL_SCALE,
  type ProceduralMaterialParams,
  type ProceduralSamplingSpace,
  type ProceduralSurfaceRole,
} from './procedural-types';
import { normalizeProceduralProfile } from './procedural-profile';
import { resolveProfileSamplingSpace } from './procedural-sampling-profiles';
import {
  isGridPaperProfileId,
  resolveGridPaperTileScale,
} from './grid-paper-unit';

export type { ProceduralSurfaceRole } from './procedural-types';

export interface ProceduralResolveOptions {
  grainAlongU?: boolean;
  surfaceRole?: ProceduralSurfaceRole;
}

/**
 * tileScale = repeats per meter on meter-mapped coordinates (frame perimeter UV or planar-meters).
 */
export function resolveProceduralSamplingSpace(
  profile: ProceduralProfileId | undefined,
  surfaceRole: ProceduralSurfaceRole = 'default',
): ProceduralSamplingSpace {
  return resolveProfileSamplingSpace(profile, surfaceRole);
}

export function proceduralParamsFromPreset(
  preset: MaterialPreset,
  tint?: Rgb,
  options: ProceduralResolveOptions = {},
): ProceduralMaterialParams {
  const baseColor = preset.color ?? { r: 0.8, g: 0.8, b: 0.8 };
  const effectiveTint = tint ?? TINT_NEUTRAL;
  const surfaceRole = options.surfaceRole ?? 'default';
  const profile = preset.proceduralProfile
    ? normalizeProceduralProfile(preset.proceduralProfile)
    : undefined;
  const tileScale = isGridPaperProfileId(profile)
    ? resolveGridPaperTileScale(preset.gridUnit, preset.tileScale)
    : (preset.tileScale ?? defaultTileScaleForProfile(profile));

  return {
    color: multiplyRgb(baseColor, effectiveTint),
    lineColor: preset.lineColor ? { ...preset.lineColor } : undefined,
    roughness: preset.roughness ?? 0.5,
    metalness: preset.metalness ?? 0,
    normalScale: preset.normalScale ?? DEFAULT_NORMAL_SCALE,
    tileScale,
    seed: preset.seed ?? 0,
    grainAlongU: options.grainAlongU ?? true,
    samplingSpace: resolveProceduralSamplingSpace(preset.proceduralProfile, surfaceRole),
  };
}
