import type { Group } from 'three/webgpu';
import {
  defaultBeverageCanParams,
} from '@/scene/asset-beverage-can';
import { defaultTinCanParams } from '@/scene/asset-tin-can';
import {
  defaultWineBottleParams,
  WINE_BOTTLE_GLASS_TRANSMISSION_MESH_DEPTH_FACTOR,
} from '@/scene/asset-wine-bottle';
import { defaultPenParams } from '@/scene/asset-pen';
import { isGeometryVisible } from '@/scene/geometry-visibility';
import {
  MATERIAL_ALUMINUM_BRUSHED_ID,
  MATERIAL_GLASS_WINE_BOTTLE_ID,
  MATERIAL_GOLD_BRUSHED_ID,
  MATERIAL_PLASTIC_MATTE_ID,
  MATERIAL_PLASTIC_SMOOTH_ID,
  MATERIAL_WOOD_POROUS_ID,
} from '@/scene/material-ids';
import { applyAssetShadowFlags } from '@/render/shadow-setup';
import {
  beverageCanLabelCoverPlaneM,
  buildBeverageCanMeshes,
} from '@/engine/beverage-can-geometry';
import {
  buildTinCanMeshes,
  tinCanLabelCoverPlaneM,
} from '@/engine/tin-can-geometry';
import {
  buildWineBottleMeshes,
  computeWineBottleLabelPlane,
} from '@/engine/wine-bottle-geometry';
import {
  buildPenMeshes,
  penBodyCoverPlaneFromProfiles,
} from '@/engine/pen-geometry';
import { loadPenLatheProfiles } from '@/engine/pen-svg-profile';
import type { AssetBuildContext } from './asset-build-context';
import { disposeAssetGroup } from './dispose-asset-group';
import { resolveRotationalPrintBodyMaterial } from './rotational-print-populate';
import { resolveMeshMaterial } from './shared';

export async function populateBeverageCanGroup(
  group: Group,
  context: AssetBuildContext,
): Promise<void> {
  disposeAssetGroup(group);
  const resolver = context.materialResolver;
  if (!resolver) {return;}

  const params = context.beverageCanParams ?? defaultBeverageCanParams('standard');
  const sizeScale = context.sizeScale ?? 1;
  const coverPlane = beverageCanLabelCoverPlaneM(params, sizeScale);
  const metalMaterialId = context.materials?.metalMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID;

  const bodyMetalMaterial = resolveRotationalPrintBodyMaterial(context, {
    assetKind: 'beverage-can',
    bodyMaterialId: metalMaterialId,
    bodyOptions: { surfaceRole: 'frame', grainAlongU: true },
    layout: 'wrap-width',
    planeW: coverPlane.planeW,
    planeH: coverPlane.planeH,
    printVisible: isGeometryVisible(context.geometryVisibility, 'label'),
  });
  if (!bodyMetalMaterial) {return;}
  const topRingMetalMaterial = resolveMeshMaterial(resolver, metalMaterialId, {
    surfaceRole: 'frame',
    grainAlongU: false,
  });

  const { bodyMesh, topRingMesh } = await buildBeverageCanMeshes({
    params,
    sizeScale,
    geometryVisibility: context.geometryVisibility,
    bodyMetalMaterial,
    topRingMetalMaterial,
  });

  group.add(bodyMesh);
  group.add(topRingMesh);
  applyAssetShadowFlags(group);
}

export function populateTinCanGroup(
  group: Group,
  context: AssetBuildContext,
): void {
  disposeAssetGroup(group);

  const params = context.tinCanParams ?? defaultTinCanParams();
  const sizeScale = context.sizeScale ?? 1;
  const coverPlane = tinCanLabelCoverPlaneM(params, sizeScale);

  const bodyMetalMaterial = resolveRotationalPrintBodyMaterial(context, {
    assetKind: 'tin-can',
    bodyMaterialId: context.materials?.metalMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID,
    bodyOptions: { surfaceRole: 'frame', grainAlongU: true },
    layout: 'wrap-width',
    planeW: coverPlane.planeW,
    planeH: coverPlane.planeH,
    printVisible: isGeometryVisible(context.geometryVisibility, 'label'),
  });
  if (!bodyMetalMaterial) {return;}

  const { bodyMesh } = buildTinCanMeshes({
    params,
    sizeScale,
    geometryVisibility: context.geometryVisibility,
    bodyMetalMaterial,
  });

  group.add(bodyMesh);
  applyAssetShadowFlags(group);
}

export async function populateWineBottleGroup(
  group: Group,
  context: AssetBuildContext,
): Promise<void> {
  disposeAssetGroup(group);
  const resolver = context.materialResolver;
  if (!resolver) {return;}

  const materials = context.materials ?? {};
  const params = context.wineBottleParams ?? defaultWineBottleParams('bordeaux');
  const sizeScale = context.sizeScale ?? 1;

  const glassMaterialId =
    materials.glassMaterialId ?? MATERIAL_GLASS_WINE_BOTTLE_ID;
  const wallThicknessM = params.wallThicknessM * sizeScale;
  const labelPlane = computeWineBottleLabelPlane(
    params,
    context.imageWidth,
    context.imageHeight,
  );
  const glassMaterial = resolveRotationalPrintBodyMaterial(context, {
    assetKind: 'wine-bottle',
    bodyMaterialId: glassMaterialId,
    bodyOptions: {
      meshDepthM: wallThicknessM * WINE_BOTTLE_GLASS_TRANSMISSION_MESH_DEPTH_FACTOR,
    },
    layout: 'wrap-width',
    planeW: labelPlane.planeW,
    planeH: labelPlane.planeH,
    printVisible: isGeometryVisible(context.geometryVisibility, 'label'),
  });
  if (!glassMaterial) {return;}
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

  const meshes = await buildWineBottleMeshes({
    params,
    sizeScale,
    geometryVisibility: context.geometryVisibility,
    imageWidth: context.imageWidth,
    imageHeight: context.imageHeight,
    glassMaterial,
    corkMaterial,
    foilMaterial,
    discMaterial,
  });

  group.add(meshes.bodyMesh);
  if (meshes.corkMesh) {group.add(meshes.corkMesh);}
  if (meshes.foilMesh) {group.add(meshes.foilMesh);}
  if (meshes.discMesh) {group.add(meshes.discMesh);}
  applyAssetShadowFlags(group);
}

export async function populatePenGroup(
  group: Group,
  context: AssetBuildContext,
): Promise<void> {
  disposeAssetGroup(group);
  const resolver = context.materialResolver;
  if (!resolver) {return;}

  const params = context.penParams ?? defaultPenParams('marker');
  const sizeScale = context.sizeScale ?? 1;
  const materials = context.materials ?? {};

  const capMaterial = resolveMeshMaterial(
    resolver,
    materials.capMaterialId ?? MATERIAL_PLASTIC_MATTE_ID,
  );
  const ringMaterial = resolveMeshMaterial(
    resolver,
    materials.ringMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID,
  );
  const profiles = await loadPenLatheProfiles(params.penBodyProfile, sizeScale);
  const coverPlane = penBodyCoverPlaneFromProfiles(profiles);
  const bodyMaterial = resolveRotationalPrintBodyMaterial(context, {
    assetKind: 'pen',
    bodyMaterialId: materials.bodyMaterialId ?? MATERIAL_PLASTIC_SMOOTH_ID,
    layout: 'wrap-height',
    planeW: coverPlane.planeW,
    planeH: coverPlane.planeH,
  });
  if (!bodyMaterial) {return;}

  const meshes = await buildPenMeshes({
    penParams: params,
    sizeScale,
    geometryVisibility: context.geometryVisibility,
    imageWidth: context.imageWidth,
    imageHeight: context.imageHeight,
    capMaterial,
    ringMaterial,
    bodyMaterial,
  });

  group.add(meshes.capMesh);
  group.add(meshes.ringMesh);
  group.add(meshes.bodyMesh);
  applyAssetShadowFlags(group);
}
