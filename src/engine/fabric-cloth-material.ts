import {
  DoubleSide,
  type MeshPhysicalNodeMaterial,
  type MeshStandardNodeMaterial,
  type Texture,
} from 'three/webgpu';
import { parseHexColor } from '@/colors/color-format';
import type { Rgb } from '@/colors/rgb';
import type { FabricClothParams } from '@/scene/asset-fabric-cloth';
import { applyFabricClothInsetBorderToMaterial } from '@/engine/fabric-cloth-border-nodes';
import { createImageOnPresetMaterial } from '@/engine/material-resolver';
import type { MaterialPresetResolver } from '@/scene/material-types';

const FALLBACK_BORDER_RGB: Rgb = { r: 0.23, g: 0.23, b: 0.23 };

function fabricClothBorderColorRgb(hex: string): Rgb {
  const parsed = parseHexColor(hex);
  if (parsed) {return parsed;}
  return FALLBACK_BORDER_RGB;
}

export function createFabricClothMaterial(
  resolvePreset: MaterialPresetResolver,
  materialId: string,
  tex: Texture | null,
  planeW: number,
  planeH: number,
  fabricClothParams: FabricClothParams,
  imageW?: number,
  imageH?: number,
  imageName?: string,
): MeshStandardNodeMaterial | MeshPhysicalNodeMaterial {
  const material = createImageOnPresetMaterial(
    resolvePreset,
    materialId,
    tex,
    planeW,
    planeH,
    imageW,
    imageH,
    imageName,
    { imageAlphaMode: 'cutout' },
  );

  if (fabricClothParams.borderEnabled && planeW > 0 && planeH > 0) {
    applyFabricClothInsetBorderToMaterial(
      material,
      planeW,
      planeH,
      fabricClothParams.borderWidthM,
      fabricClothBorderColorRgb(fabricClothParams.borderColor),
    );
  }

  material.side = DoubleSide;

  return material;
}
