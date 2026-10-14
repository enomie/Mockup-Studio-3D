import { multiplyRgb, type Rgb } from '@/colors/rgb';
import {
  TINT_NEUTRAL,
  type MaterialPreset,
  type ProceduralProfileId,
} from '@/scene/material-types';
import {
  DEFAULT_NORMAL_SCALE,
  DEFAULT_TILE_SCALE_GRID_PAPER,
  DEFAULT_TILE_SCALE_PAPER,
  DEFAULT_TILE_SCALE_WOOD,
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
    : (preset.tileScale ?? defaultTileScaleForProfile(preset.proceduralProfile));

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

function defaultTileScaleForProfile(
  profile: MaterialPreset['proceduralProfile'],
): number {
  const resolved = profile ? normalizeProceduralProfile(profile) : undefined;
  if (resolved === 'wood-soft' || resolved === 'wood-porous') {
    return DEFAULT_TILE_SCALE_WOOD;
  }
  if (resolved === 'paper-grain') {return DEFAULT_TILE_SCALE_PAPER;}
  if (resolved === 'grid-paper-opaque' || resolved === 'grid-paper-lines') {
    return DEFAULT_TILE_SCALE_GRID_PAPER;
  }
  if (
    resolved === 'fabric-linen' ||
    resolved === 'silk-fine' ||
    resolved === 'concrete-stained' ||
    resolved === 'concrete-porous' ||
    resolved === 'coated-gloss' ||
    resolved === 'plastic-matte' ||
    resolved === 'plastic-smooth'
  ) {
    return 6;
  }
  return 4;
}
