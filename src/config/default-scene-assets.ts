import type { AssetKind } from '@/scene/entity-types';
import type { MaterialEntitySlot } from '@/scene/material-types';

export const DEFAULT_SCENE_NAME = 'Default';

export interface DefaultSceneAsset {
  assetKind: AssetKind;
  /** World-space XZ position (Y from spawn rules unless `positionY`). */
  position: { x: number; z: number };
  /** Foot world Y for foot-pivot kinds (`block`, `fabric-cloth`, …). */
  positionY?: number;
  screenImageId?: string;
  materialSlot?: MaterialEntitySlot;
  materialId?: string;
}

/** App-start layout: block on ground + silk fabric cloth elevated for physics/cloth staging. */
export const DEFAULT_SCENE_ASSETS: readonly DefaultSceneAsset[] = [
  { assetKind: 'block', position: { x: 0, z: 0 } },
  {
    assetKind: 'fabric-cloth',
    position: { x: 0, z: 0 },
    positionY: 0.5,
    materialSlot: 'fabricClothMaterialId',
    materialId: 'material-silk',
  },
];
