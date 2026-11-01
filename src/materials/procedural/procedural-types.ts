import type { MeshStandardNodeMaterial } from 'three/webgpu';
import type { Rgb } from '@/colors/rgb';

export type ProceduralSurfaceRole = 'frame' | 'default' | 'ground';

export type ProceduralSamplingSpace =
  | 'uv'
  | 'planar-meters'
  | 'triplanar-meters'
  | 'meter-3d';

export interface ProceduralMaterialParams {
  color: Rgb;
  lineColor?: Rgb;
  tint?: Rgb;
  roughness: number;
  metalness: number;
  normalScale: number;
  tileScale: number;
  seed: number;
  /** When true, grain runs along UV.u (horizontal frame bars); false = UV.v (vertical bars). */
  grainAlongU: boolean;
  samplingSpace: ProceduralSamplingSpace;
}

export interface ProceduralMaterialNodes {
  colorNode: NonNullable<MeshStandardNodeMaterial['colorNode']>;
  normalNode?: NonNullable<MeshStandardNodeMaterial['normalNode']>;
  roughnessNode: NonNullable<MeshStandardNodeMaterial['roughnessNode']>;
  opacityNode?: NonNullable<MeshStandardNodeMaterial['opacityNode']>;
  transparent?: boolean;
  depthWrite?: boolean;
}

export const DEFAULT_TILE_SCALE_WOOD = 6;
/** Repeats per meter — ~400 ≈ 2.5 mm grain period. */
export const DEFAULT_TILE_SCALE_PAPER = 400;
/** Lines per meter — 1000 = 1 mm grid pitch. */
export const DEFAULT_TILE_SCALE_GRID_PAPER = 1000;
export const DEFAULT_NORMAL_SCALE = 1;
