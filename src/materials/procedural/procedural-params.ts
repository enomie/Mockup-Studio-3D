import { multiplyRgb, type Rgb } from '@/colors/rgb';
import {
  TINT_NEUTRAL,
  type MaterialPreset,
  type ProceduralProfileId,
} from '@/scene/material-types';
import {
  DEFAULT_NORMAL_SCALE,
  DEFAULT_TILE_SCALE_PAPER,
  DEFAULT_TILE_SCALE_WOOD,
  type ProceduralMaterialParams,
  type ProceduralSamplingSpace,
} from './procedural-types';
import { normalizeProceduralProfile } from './procedural-profile';

export type ProceduralSurfaceRole = 'frame' | 'default' | 'ground';

export type ProceduralResolveOptions = {
  grainAlongU?: boolean;
  surfaceRole?: ProceduralSurfaceRole;
};

/**
 * tileScale = repeats per meter on meter-mapped coordinates (frame perimeter UV or planar-meters).
 */
export function resolveProceduralSamplingSpace(
  profile: ProceduralProfileId | undefined,
  surfaceRole: ProceduralSurfaceRole = 'default',
): ProceduralSamplingSpace {
  const resolved = profile ? normalizeProceduralProfile(profile) : undefined;
  if (resolved === 'paper-grain') return 'planar-meters';
  if (surfaceRole === 'frame') return 'uv';
  if (surfaceRole === 'ground') return 'planar-meters';
  return 'uv';
}

export function proceduralParamsFromPreset(
  preset: MaterialPreset,
  tint?: Rgb,
  options: ProceduralResolveOptions = {},
): ProceduralMaterialParams {
  const baseColor = preset.color ?? { r: 0.8, g: 0.8, b: 0.8 };
  const effectiveTint = tint ?? TINT_NEUTRAL;
  const surfaceRole = options.surfaceRole ?? 'default';

  return {
    color: multiplyRgb(baseColor, effectiveTint),
    roughness: preset.roughness ?? 0.5,
    metalness: preset.metalness ?? 0,
    normalScale: preset.normalScale ?? DEFAULT_NORMAL_SCALE,
    tileScale: preset.tileScale ?? defaultTileScaleForProfile(preset.proceduralProfile),
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
  if (resolved === 'paper-grain') return DEFAULT_TILE_SCALE_PAPER;
  return 4;
}
