import {
  DoubleSide,
  Mesh,
  MeshStandardNodeMaterial,
  type Group,
} from 'three/webgpu';
import {
  defaultTrianglePatchParams,
  getPatchMirrorSigns,
  isQuadPatchParams,
  type PatchParams,
} from '@/scene/asset-triangle-patch';
import { buildTrianglePatchGeometry } from '@/engine/triangle-patch-geometry';
import { buildQuadPatchGeometry } from '@/engine/quad-patch-geometry';
import type { MaterialResolver } from '@/engine/material-resolver';
import type { AssetMaterialSlots } from '@/scene/material-types';
import { MATERIAL_ALUMINUM_BRUSHED_ID } from '@/scene/material-ids';

export function addTrianglePatch(
  group: Group,
  resolver: MaterialResolver | undefined,
  materials: AssetMaterialSlots = {},
  patchParams: PatchParams = defaultTrianglePatchParams(),
): Mesh {
  const geometry = isQuadPatchParams(patchParams)
    ? buildQuadPatchGeometry(patchParams)
    : buildTrianglePatchGeometry(patchParams);

  // Resolve material or fallback to double-sided PBR material
  const materialId = materials.patchMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID;
  let material = resolver?.create(materialId);
  if (!material) {
    material = new MeshStandardNodeMaterial({
      color: 0x0284c7,
      roughness: 0.25,
      metalness: 0.2,
      side: DoubleSide,
    });
  } else {
    // Ensure the patch is rendered on both sides
    material.side = DoubleSide;
  }

  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isAssetScreen = true;
  mesh.userData.assetMeshRole = 'trianglePatch';

  group.add(mesh);

  // Mirror copies share geometry and material; the negative scale flips the
  // winding, which three.js compensates for via the negative determinant.
  for (const sign of getPatchMirrorSigns(patchParams.mirror)) {
    const copy = new Mesh(geometry, material);
    copy.scale.set(sign.x, sign.y, sign.z);
    copy.castShadow = true;
    copy.receiveShadow = true;
    copy.userData.isAssetScreen = true;
    copy.userData.assetMeshRole = 'trianglePatchMirror';
    group.add(copy);
  }
  return mesh;
}

