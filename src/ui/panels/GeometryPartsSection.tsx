import type { AssetEntity, MaterialPreset } from '@/scene/entity-types';
import type { AssetMaterialSlots, MaterialEntitySlot } from '@/scene/material-types';
import {
  defaultGeometryVisibility,
  isGeometryVisible,
  migrateGeometryVisibility,
} from '@/scene/geometry-visibility';
import { getAssetKindDefinition } from '@/scene/asset-kind-registry';
import {
  geometryPartMaterialSlot,
  type AssetGeometryPartDescriptor,
} from '@/scene/geometry-parts';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { setGeometryVisible } from '@/ui/store/app-store';
import { GeometryPartField } from '@/ui/panels/GeometryPartField';

interface GeometryPartsSectionProps {
  entity: AssetEntity;
  materials: MaterialPreset[];
  parts: readonly AssetGeometryPartDescriptor[];
}

function resolveMaterialIdForSlot(
  assetKind: AssetEntity['assetKind'],
  slots: AssetMaterialSlots | undefined,
  slot: MaterialEntitySlot,
): string {
  const defaults = getAssetKindDefinition(assetKind).getDefaultMaterials();
  const resolved = slots?.[slot] ?? defaults[slot];
  if (!resolved) {
    throw new Error(`No default material for slot "${slot}" on kind "${assetKind}".`);
  }
  return resolved;
}

export function GeometryPartsSection({
  entity,
  materials,
  parts,
}: GeometryPartsSectionProps) {
  const slots = entity.materials;
  const visibility = migrateGeometryVisibility(
    entity.assetKind,
    entity.geometryVisibility ?? defaultGeometryVisibility(entity.assetKind),
    slots,
  );

  return (
    <>
      {parts.map((descriptor) => {
        if (descriptor.ui === 'visibility-only') {
          return (
            <PanelCheckbox
              key={descriptor.part}
              label={descriptor.label}
              checked={isGeometryVisible(visibility, descriptor.part)}
              onChange={(checked) => { setGeometryVisible(entity.id, descriptor.part, checked); }
              }
            />
          );
        }

        const slot = geometryPartMaterialSlot(descriptor);
        return (
          <GeometryPartField
            key={descriptor.part}
            entityId={entity.id}
            part={descriptor.part}
            label={descriptor.label}
            slot={slot}
            visible={isGeometryVisible(visibility, descriptor.part)}
            materialId={resolveMaterialIdForSlot(entity.assetKind, slots, slot)}
            materials={materials}
          />
        );
      })}
    </>
  );
}
