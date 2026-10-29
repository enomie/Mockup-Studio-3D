import { isFabricClothAssetKind } from './asset-fabric-cloth';
import type { AssetEntity } from './entity-types';
import type { WorldPhysicsPhase } from './physics-settings';

export interface BakeEntityHints {
  hasFabricClothSession: boolean;
}

export function canBakeEntity(
  entity: AssetEntity | null | undefined,
  worldPhysicsPhase: WorldPhysicsPhase,
  hints: BakeEntityHints,
): boolean {
  if (!entity || worldPhysicsPhase !== 'paused') {
    return false;
  }
  if (!isFabricClothAssetKind(entity.assetKind)) {
    return false;
  }
  return hints.hasFabricClothSession;
}
