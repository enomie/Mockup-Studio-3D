import type { Group } from 'three/webgpu';
import {
  defaultBeverageCanParams,
} from '@/scene/asset-beverage-can';
import { defaultTinCanParams } from '@/scene/asset-tin-can';
import {
  defaultWineBottleParams,
  WINE_BOTTLE_GLASS_TRANSMISSION_MESH_DEPTH_FACTOR,
} from '@/scene/asset-wine-bottle';
import { resolveImageSurfaceSettings } from '@/scene/image-surface';
import {
  MATERIAL_GLASS_WINE_BOTTLE_ID,
  MATERIAL_GOLD_BRUSHED_ID,
  MATERIAL_WOOD_POROUS_ID,
} from '@/scene/material-ids';
import { applyAssetShadowFlags } from '@/render/shadow-setup';
import {
  beverageCanLabelCoverPlaneM,
  buildBeverageCanMeshes,
} from '@/engine/beverage-can-geometry';
import { prepareCylindricalCanPopulateSetup } from '@/engine/cylindrical-can-populate';
import {
  createImagePbrMaterial,
} from '@/engine/material-resolver';
import {
  buildTinCanMeshes,
  tinCanLabelCoverPlaneM,
} from '@/engine/tin-can-geometry';
import {
  buildWineBottleMeshes,
  computeWineBottleLabelPlane,
} from '@/engine/wine-bottle-geometry';
import type { AssetBuildContext } from './asset-build-context';
import { disposeAssetGroup } from './dispose-asset-group';
import { resolveMeshMaterial } from './shared';

export async function populateBeverageCanGroup(
  group: Group,
  context: AssetBuildContext,
): Promise<void> {
  disposeAssetGroup(group);

  const params = context.beverageCanParams ?? defaultBeverageCanParams('standard');
  const sizeScale = context.sizeScale ?? 1;
  const coverPlane = beverageCanLabelCoverPlaneM(params, sizeScale);

  const setup = prepareCylindricalCanPopulateSetup(context, {
    assetKind: 'beverage-can',
    planeW: coverPlane.planeW,
    planeH: coverPlane.planeH,
    includeTopRingMetal: true,
  });
  if (!setup) return;

  const { bodyMesh, labelMesh, topRingMesh } = await buildBeverageCanMeshes({
    params,
    sizeScale,
    geometryVisibility: context.geometryVisibility,
    labelPrintVisible: setup.hasLabelImage,
    bodyMetalMaterial: setup.bodyMetalMaterial,
    topRingMetalMaterial: setup.topRingMetalMaterial!,
    labelMaterial: setup.labelMaterial,
  });

  group.add(bodyMesh);
  if (labelMesh) {
    group.add(labelMesh);
  }
  group.add(topRingMesh);
  applyAssetShadowFlags(group);
}

export async function populateTinCanGroup(
  group: Group,
  context: AssetBuildContext,
): Promise<void> {
  disposeAssetGroup(group);

  const params = context.tinCanParams ?? defaultTinCanParams();
  const sizeScale = context.sizeScale ?? 1;
  const coverPlane = tinCanLabelCoverPlaneM(params, sizeScale);

  const setup = prepareCylindricalCanPopulateSetup(context, {
    assetKind: 'tin-can',
    planeW: coverPlane.planeW,
    planeH: coverPlane.planeH,
    applyTinLabelPolygonOffset: true,
  });
  if (!setup) return;

  const { bodyMesh, labelMesh } = buildTinCanMeshes({
    params,
    sizeScale,
    geometryVisibility: context.geometryVisibility,
    labelPrintVisible: setup.hasLabelImage,
    bodyMetalMaterial: setup.bodyMetalMaterial,
    labelMaterial: setup.labelMaterial,
  });

  group.add(bodyMesh);
  if (labelMesh) {
    group.add(labelMesh);
  }
  applyAssetShadowFlags(group);
}

export async function populateWineBottleGroup(
  group: Group,
  context: AssetBuildContext,
): Promise<void> {
  disposeAssetGroup(group);
  const resolver = context.materialResolver;
  if (!resolver) return;

  const materials = context.materials ?? {};
  const params = context.wineBottleParams ?? defaultWineBottleParams('bordeaux');
  const sizeScale = context.sizeScale ?? 1;

  const glassMaterialId =
    materials.glassMaterialId ?? MATERIAL_GLASS_WINE_BOTTLE_ID;
  const wallThicknessM = params.wallThicknessM * sizeScale;
  const glassMaterial = resolveMeshMaterial(resolver, glassMaterialId, {
    meshDepthM: wallThicknessM * WINE_BOTTLE_GLASS_TRANSMISSION_MESH_DEPTH_FACTOR,
  });

  const corkMaterial = resolveMeshMaterial(
    resolver,
    materials.corkMaterialId ?? MATERIAL_WOOD_POROUS_ID,
  );
  const foilMaterial = resolveMeshMaterial(
    resolver,
    materials.capsuleFoilMaterialId ?? MATERIAL_GOLD_BRUSHED_ID,
    { surfaceRole: 'frame', grainAlongU: true },
  );
  const discMaterial = resolveMeshMaterial(
    resolver,
    materials.capsuleDiscMaterialId ?? MATERIAL_GOLD_BRUSHED_ID,
    { surfaceRole: 'frame', grainAlongU: false },
  );

  const hasLabelImage = Boolean(context.imageTexture);
  const labelPlane = computeWineBottleLabelPlane(
    params,
    context.imageWidth,
    context.imageHeight,
  );
  const labelMaterial =
    hasLabelImage && context.imageTexture
      ? createImagePbrMaterial(
          (id) => resolver.resolvePreset(id),
          resolveImageSurfaceSettings(context.imageSurfaces, 'label', {
            assetKind: 'wine-bottle',
          }),
          context.imageTexture,
          labelPlane.planeW * sizeScale,
          labelPlane.planeH * sizeScale,
          context.imageWidth,
          context.imageHeight,
        )
      : glassMaterial;

  const meshes = await buildWineBottleMeshes({
    params,
    sizeScale,
    geometryVisibility: context.geometryVisibility,
    labelPrintVisible: hasLabelImage,
    imageWidth: context.imageWidth,
    imageHeight: context.imageHeight,
    glassMaterial,
    corkMaterial,
    foilMaterial,
    discMaterial,
    labelMaterial,
  });

  group.add(meshes.bodyMesh);
  if (meshes.labelMesh) group.add(meshes.labelMesh);
  if (meshes.corkMesh) group.add(meshes.corkMesh);
  if (meshes.foilMesh) group.add(meshes.foilMesh);
  if (meshes.discMesh) group.add(meshes.discMesh);
  applyAssetShadowFlags(group);
}
