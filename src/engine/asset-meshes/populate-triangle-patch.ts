import {
  DoubleSide,
  Matrix4,
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
import { applyEdgeCorrectionToGeometry, prepareEdgeCorrection } from '@/engine/patch-edge-correction';
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
  // Linked edges with smooth joints: correct the slope in a strip so partners meet without a crease.
  const correction = prepareEdgeCorrection(patchParams);
  if (correction) {applyEdgeCorrectionToGeometry(geometry, correction);}

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

  // Mirror copies share geometry and material and are mirrored across the scene
  // (world) planes, not the asset's own pivot planes; the negative determinant
  // flips the winding, which three.js compensates for.
  for (const sign of getPatchMirrorSigns(patchParams.mirror)) {
    const copy = new Mesh(geometry, material);
    copy.castShadow = true;
    copy.receiveShadow = true;
    copy.userData.isAssetScreen = true;
    copy.userData.assetMeshRole = 'trianglePatchMirror';
    copy.userData.patchMirrorSign = { ...sign };
    applyWorldMirror(copy, new Matrix4().makeScale(sign.x, sign.y, sign.z));
    group.add(copy);
  }
  return mesh;
}

/**
 * Keeps `copy.matrixWorld = mirror * parent.matrixWorld`, so the copy is the
 * parent's content reflected across the world planes through the origin and
 * follows every move, rotation and scale of the asset without a rebuild.
 */
function applyWorldMirror(copy: Mesh, mirror: Matrix4): void {
  copy.matrixAutoUpdate = false;
  const syncWorld = (): void => {
    if (copy.parent) {
      copy.matrixWorld.multiplyMatrices(mirror, copy.parent.matrixWorld);
    } else {
      copy.matrixWorld.copy(mirror);
    }
    // Keep the local matrix consistent for code that reads it (e.g. exporters).
    if (copy.parent) {
      copy.matrix.copy(copy.parent.matrixWorld).invert().multiply(copy.matrixWorld);
    } else {
      copy.matrix.copy(copy.matrixWorld);
    }
    copy.matrix.decompose(copy.position, copy.quaternion, copy.scale);
    copy.matrixWorldNeedsUpdate = false;
  };
  copy.updateMatrixWorld = (): void => {
    syncWorld();
  };
  copy.updateWorldMatrix = (updateParents: boolean): void => {
    if (updateParents && copy.parent) {copy.parent.updateWorldMatrix(true, false);}
    syncWorld();
  };
}

