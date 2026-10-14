import type { Material } from 'three/webgpu';
import { resolveImageSurfaceSettings } from '@/scene/image-surface';
import { MATERIAL_ALUMINUM_BRUSHED_ID } from '@/scene/material-ids';
import {
  createCanLabelMaterial,
  type MaterialResolveOptions,
} from './material-resolver';
import type { AssetBuildContext } from './asset-meshes/asset-build-context';
import { resolveMeshMaterial } from './asset-meshes/shared';

export type CylindricalCanLabelAssetKind = 'beverage-can' | 'tin-can';

export interface CylindricalCanPopulateSetup {
  bodyMetalMaterial: Material;
  labelMaterial: Material;
  topRingMetalMaterial?: Material;
  hasLabelImage: boolean;
}

export function prepareCylindricalCanPopulateSetup(
  context: AssetBuildContext,
  options: {
    assetKind: CylindricalCanLabelAssetKind;
    planeW: number;
    planeH: number;
    includeTopRingMetal?: boolean;
    applyTinLabelPolygonOffset?: boolean;
  },
): CylindricalCanPopulateSetup | null {
  const resolver = context.materialResolver;
  if (!resolver) {return null;}

  const materials = context.materials ?? {};
  const metalMaterialId = materials.metalMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID;
  const brushedAluOptions: MaterialResolveOptions = {
    surfaceRole: 'frame',
    grainAlongU: true,
  };
  const bodyMetalMaterial = resolveMeshMaterial(
    resolver,
    metalMaterialId,
    brushedAluOptions,
  );

  const topRingMetalMaterial = options.includeTopRingMetal
    ? resolveMeshMaterial(resolver, metalMaterialId, {
        surfaceRole: 'frame',
        grainAlongU: false,
      })
    : undefined;

  const hasLabelImage = Boolean(context.imageTexture);
  let labelMaterial: Material = bodyMetalMaterial;
  if (hasLabelImage && context.imageTexture) {
    labelMaterial = createCanLabelMaterial(
      (id: string) => resolver.resolvePreset(id),
      resolveImageSurfaceSettings(context.imageSurfaces, 'label', {
        assetKind: options.assetKind,
      }),
      context.imageTexture,
      options.planeW,
      options.planeH,
      context.imageWidth,
      context.imageHeight,
    );
  }

  if (
    options.applyTinLabelPolygonOffset &&
    hasLabelImage &&
    labelMaterial !== bodyMetalMaterial
  ) {
    labelMaterial.polygonOffset = true;
    labelMaterial.polygonOffsetFactor = -2;
    labelMaterial.polygonOffsetUnits = -2;
  }

  return {
    bodyMetalMaterial,
    labelMaterial,
    topRingMetalMaterial,
    hasLabelImage,
  };
}
