import type { AssetEntity } from './entity-types';
import { canonicalProfileId } from './profile-registry';

/** Profile id an asset's geometry depends on, or null (wine bottle and extrusion). */
export function entityProfileId(entity: AssetEntity): string | null {
  if (entity.assetKind === 'extrusion') {
    const id = entity.extrusionParams?.profileId;
    return id ? canonicalProfileId(id) : null;
  }
  const id = entity.wineBottleParams?.wineBottleBodyProfile;
  return entity.assetKind === 'wine-bottle' && id ? canonicalProfileId(id) : null;
}

export function countProfileUsage(entities: readonly AssetEntity[], profileId: string): number {
  const id = canonicalProfileId(profileId);
  return entities.filter((entity) => entityProfileId(entity) === id).length;
}
