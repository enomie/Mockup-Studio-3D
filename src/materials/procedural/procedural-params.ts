import { multiplyRgb, type Rgb } from '@/colors/rgb';
import {
  TINT_NEUTRAL,
  type MaterialPreset,
  type ProceduralProfileId,
} from '@/scene/material-types';
import { defaultTileScaleForProfile, proceduralProfileSpec } from '../material-spec';
import {
  DEFAULT_NORMAL_SCALE,
  type ProceduralMaterialParams,
  type ProceduralSamplingSpace,
  type ProceduralSurfaceRole,
} from './procedural-types';
import { normalizeProceduralProfile } from './procedural-profile';
import {
  createProceduralUniforms,
  type ProceduralUniformValues,
} from './procedural-uniforms';
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

/** Render-time values of a procedural preset (color × tint, line color, roughness). */
export function proceduralUniformValuesFromPreset(
  preset: MaterialPreset,
  tint?: Rgb,
): ProceduralUniformValues {
  const baseColor = preset.color ?? { r: 0.8, g: 0.8, b: 0.8 };
  const profile = preset.proceduralProfile
    ? normalizeProceduralProfile(preset.proceduralProfile)
    : undefined;
  return {
    color: multiplyRgb(baseColor, tint ?? TINT_NEUTRAL),
    lineColor: preset.lineColor ? { ...preset.lineColor } : undefined,
    roughness:
      preset.roughness ?? (profile ? proceduralProfileSpec(profile).roughness.default : 0.5),
  };
}

export function proceduralParamsFromPreset(
  preset: MaterialPreset,
  tint?: Rgb,
  options: ProceduralResolveOptions = {},
): ProceduralMaterialParams {
  const values = proceduralUniformValuesFromPreset(preset, tint);
  const surfaceRole = options.surfaceRole ?? 'default';
  const profile = preset.proceduralProfile
    ? normalizeProceduralProfile(preset.proceduralProfile)
    : undefined;
  const tileScale = isGridPaperProfileId(profile)
    ? resolveGridPaperTileScale(preset.gridUnit, preset.tileScale)
    : (preset.tileScale ?? defaultTileScaleForProfile(profile));

  return {
    color: values.color,
    lineColor: values.lineColor,
    roughness: values.roughness,
    metalness: preset.metalness ?? 0,
    normalScale: preset.normalScale ?? DEFAULT_NORMAL_SCALE,
    tileScale,
    seed: preset.seed ?? 0,
    grainAlongU: options.grainAlongU ?? true,
    samplingSpace: resolveProceduralSamplingSpace(preset.proceduralProfile, surfaceRole),
    uniforms: createProceduralUniforms(values),
    sheen: preset.sheen ?? (profile ? proceduralProfileSpec(profile).sheen?.amount.default : undefined) ?? 0,
    sheenRoughness:
      preset.sheenRoughness ??
      (profile ? proceduralProfileSpec(profile).sheen?.roughness.default : undefined) ??
      0.5,
  };
}
