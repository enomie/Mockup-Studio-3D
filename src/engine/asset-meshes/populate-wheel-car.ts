import type { Group } from 'three/webgpu';
import { applyAssetShadowFlags } from '@/render/shadow-setup';
import { addWheelCarMeshesFromSvg } from '@/engine/wheel-car-geometry';
import { loadWheelCarLatheProfiles } from '@/engine/wheel-car-svg-profile';
import type { MaterialResolver } from '@/engine/material-resolver';
import {
  defaultWheelCarParams,
  type WheelCarParams,
} from '@/scene/asset-wheel-car';
import {
  MATERIAL_CHROME_ID,
  MATERIAL_PLASTIC_MATTE_ID,
} from '@/scene/material-ids';
import type { AssetMaterialSlots } from '@/scene/material-types';
import { disposeAssetGroup } from './dispose-asset-group';
import { resolveMeshMaterial } from './shared';

export async function addWheelCar(
  group: Group,
  resolver: MaterialResolver,
  materials: AssetMaterialSlots = {},
  wheelCarParams: WheelCarParams = defaultWheelCarParams(),
  sizeScale = 1,
): Promise<void> {
  disposeAssetGroup(group);
  const tireMaterialId = materials.tireMaterialId ?? MATERIAL_PLASTIC_MATTE_ID;
  const rimMaterialId = materials.rimMaterialId ?? MATERIAL_CHROME_ID;
  const tireMaterial = resolveMeshMaterial(resolver, tireMaterialId);
  const rimMaterial = resolveMeshMaterial(resolver, rimMaterialId);
  const profiles = await loadWheelCarLatheProfiles(sizeScale);
  addWheelCarMeshesFromSvg(
    group,
    profiles,
    wheelCarParams,
    sizeScale,
    tireMaterial,
    rimMaterial,
  );
  applyAssetShadowFlags(group);
}
