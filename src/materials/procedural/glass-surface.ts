import { bumpMap, float, mx_noise_float, vec3 } from 'three/tsl';
import type { MeshPhysicalNodeMaterial } from 'three/webgpu';
import type { MaterialPreset } from '@/scene/material-types';
import { meterPositionLocal } from './procedural-position';
import type { ProceduralMaterialParams } from './procedural-types';

export const DEFAULT_GLASS_SURFACE_NORMAL_SCALE = 0.15;
export const DEFAULT_GLASS_SURFACE_TILE_SCALE = 10;

export function glassSurfaceParamsFromPreset(preset: MaterialPreset): ProceduralMaterialParams {
  const scale = preset.surfaceNormalScale ?? DEFAULT_GLASS_SURFACE_NORMAL_SCALE;
  return {
    color: { r: 1, g: 1, b: 1 },
    roughness: preset.roughness ?? 0.02,
    metalness: 0,
    normalScale: scale,
    tileScale: preset.tileScale ?? DEFAULT_GLASS_SURFACE_TILE_SCALE,
    seed: preset.seed ?? 0,
    grainAlongU: true,
    samplingSpace: 'meter-3d',
  };
}

export function buildGlassSurfaceNormalNode(params: ProceduralMaterialParams) {
  const seed = float(params.seed);
  const noiseCoord = meterPositionLocal(params.tileScale, params.seed);

  const micro = mx_noise_float(noiseCoord.mul(64).add(vec3(seed.mul(5.3), 0, seed.mul(11.7))))
    .sub(0.5)
    .mul(0.04);

  const bumpStrength = float(params.normalScale * 0.02);
  const height = micro.add(0.5);
  return bumpMap(height, bumpStrength);
}

export function buildGlassSurfaceNodes(params: ProceduralMaterialParams) {
  const normalNode = buildGlassSurfaceNormalNode(params);
  const roughnessNode = float(params.roughness);
  const colorNode = vec3(1, 1, 1);
  return {
    colorNode,
    normalNode,
    roughnessNode,
  };
}

export function effectiveGlassSurfaceNormalScale(preset: MaterialPreset): number {
  return preset.surfaceNormalScale ?? DEFAULT_GLASS_SURFACE_NORMAL_SCALE;
}

export function applyGlassSurfaceToPhysicalMaterial(
  material: MeshPhysicalNodeMaterial,
  preset: MaterialPreset,
): void {
  const scale = effectiveGlassSurfaceNormalScale(preset);
  if (scale <= 0) {return;}

  const params = glassSurfaceParamsFromPreset(preset);
  material.normalNode = buildGlassSurfaceNormalNode(params);
}
