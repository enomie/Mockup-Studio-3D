import type { AssetEntity } from './entity-types';
import { canonicalProfileId } from './profile-registry';

/** Profile id an asset's geometry depends on, or null (profile-based assets only). */
export function entityProfileId(entity: AssetEntity): string | null {
  const id = rawEntityProfileId(entity);
  return id ? canonicalProfileId(id) : null;
}

function rawEntityProfileId(entity: AssetEntity): string | undefined {
  switch (entity.assetKind) {
    case 'extrusion':
      return entity.extrusionParams?.profileId;
    case 'wine-bottle':
      return entity.wineBottleParams?.wineBottleBodyProfile;
    case 'pen':
      return entity.penParams?.penBodyProfile;
    case 'beverage-can':
      return entity.beverageCanParams?.canBodyProfile;
    case 'wheel-car':
      // Older wheels have no profile id: they use the built-in wheel.
      return entity.wheelCarParams?.profileId ?? 'wheel-car';
    default:
      return undefined;
  }
}

export function countProfileUsage(entities: readonly AssetEntity[], profileId: string): number {
  const id = canonicalProfileId(profileId);
  return entities.filter((entity) => entityProfileId(entity) === id).length;
}
