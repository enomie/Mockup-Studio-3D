import type { AssetKind } from '@/scene/entity-types';

export const DEFAULT_SCENE_NAME = 'Default';

export type DefaultSceneAsset = {
  assetKind: AssetKind;
  /** World-space XZ position (Y is computed from asset footprint). */
  position: { x: number; z: number };
};

/** Temporary QA layout: single wine bottle (portfolio assets restored later via builtin-scenes). */
export const DEFAULT_SCENE_ASSETS: readonly DefaultSceneAsset[] = [
  { assetKind: 'wine-bottle', position: { x: 0, z: 0 } },
];
