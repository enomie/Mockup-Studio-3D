import type { MeshStandardNodeMaterial } from 'three/webgpu';
import type { Rgb } from '@/colors/rgb';
import type { ProceduralProfileId } from '@/scene/material-types';

export type { ProceduralProfileId };

export type ProceduralSamplingSpace = 'uv' | 'planar-meters';

export type ProceduralMaterialParams = {
  color: Rgb;
  tint?: Rgb;
  roughness: number;
  metalness: number;
  normalScale: number;
  tileScale: number;
  seed: number;
  /** When true, grain runs along UV.u (horizontal frame bars); false = UV.v (vertical bars). */
  grainAlongU: boolean;
  samplingSpace: ProceduralSamplingSpace;
};

export type ProceduralMaterialNodes = {
  colorNode: NonNullable<MeshStandardNodeMaterial['colorNode']>;
  normalNode?: NonNullable<MeshStandardNodeMaterial['normalNode']>;
  roughnessNode: NonNullable<MeshStandardNodeMaterial['roughnessNode']>;
};

export const DEFAULT_TILE_SCALE_WOOD = 6;
/** Repeats per meter — ~400 ≈ 2.5 mm grain period. */
export const DEFAULT_TILE_SCALE_PAPER = 400;
export const DEFAULT_NORMAL_SCALE = 1;
