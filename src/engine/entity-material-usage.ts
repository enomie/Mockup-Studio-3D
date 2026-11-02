import { getAssetKindDefinition } from '@/scene/asset-kind-registry';
import type { AssetEntity } from '@/scene/entity-types';
import { MATERIAL_PAPER_ID, migrateMaterialId } from '@/scene/material-ids';
import { MATERIAL_ENTITY_SLOTS } from '@/scene/material-types';

/** True when the entity renders image content (image planes and passepartouts use the Paper preset). */
function entityHasImageContent(entity: AssetEntity): boolean {
  return (
    entity.screenImageId != null ||
    entity.faces !== undefined ||
    entity.imageSurfaces !== undefined ||
    entity.bookBackCoverImageId != null ||
    entity.bookSpineImageId != null
  );
}

/**
 * All material preset ids (migrated) an entity's meshes are built from:
 * explicit slots, kind defaults when the entity has no slots, and Paper for image content.
 */
export function collectEntityMaterialIds(entity: AssetEntity): Set<string> {
  const slots =
    entity.materials ?? getAssetKindDefinition(entity.assetKind).getDefaultMaterials();
  const ids = new Set<string>();
  for (const slot of MATERIAL_ENTITY_SLOTS) {
    const id = slots[slot];
    if (id) {ids.add(migrateMaterialId(id));}
  }
  if (entityHasImageContent(entity)) {ids.add(MATERIAL_PAPER_ID);}
  return ids;
}

export function entityUsesMaterial(entity: AssetEntity, materialId: string): boolean {
  return collectEntityMaterialIds(entity).has(migrateMaterialId(materialId));
}
