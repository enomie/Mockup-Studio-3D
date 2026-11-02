import type { MaterialEntitySlot, MaterialPreset } from '@/scene/entity-types';
import type { MaterialKind } from '@/scene/material-types';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { sortPanelSelectOptions } from '@/ui/utils/library-list-order';
import { isPaperMaterialId, resolveSlotGloss } from '@/scene/paper-gloss';
import { FinishSlider } from '@/ui/components/FinishSlider';
import { setEntityMaterial, setEntityMaterialGloss } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

interface MaterialSelectProps {
  entityId: string;
  slot: MaterialEntitySlot;
  label?: string;
  ariaLabel?: string;
  value: string | undefined;
  materials: MaterialPreset[];
  id?: string;
  filterKind?: 'solid-pbr' | 'transmission';
  excludeKinds?: MaterialKind[];
  filterGlassVariant?: 'pane' | 'solid';
  allowedMaterialIds?: readonly string[];
  disabled?: boolean;
}

export function MaterialSelect({
  entityId,
  slot,
  label,
  ariaLabel,
  value,
  materials,
  id,
  filterKind,
  excludeKinds,
  filterGlassVariant,
  allowedMaterialIds,
  disabled = false,
}: MaterialSelectProps) {
  const slotMaterials = useAppStore(
    (state) => state.entities.find((entry) => entry.id === entityId)?.materials,
  );
  const filtered = materials.filter((material) => {
    if (allowedMaterialIds && !allowedMaterialIds.includes(material.id)) {return false;}
    if (excludeKinds?.includes(material.kind)) {return false;}
    if (filterKind && material.kind !== filterKind) {return false;}
    if (
      filterGlassVariant &&
      material.glassVariant &&
      material.glassVariant !== filterGlassVariant
    ) {
      return false;
    }
    return true;
  });

  const options =
    value && !filtered.some((material) => material.id === value)
      ? [
          ...filtered,
          ...materials.filter((material) => material.id === value),
        ]
      : filtered;

  return (
    <>
      <PanelSelect
        label={label}
        ariaLabel={ariaLabel ?? label ?? `${slot} material`}
        id={id}
        value={value ?? ''}
        disabled={disabled}
        options={sortPanelSelectOptions(
          options.map((material) => ({
            value: material.id,
            label: material.name,
          })),
        )}
        onChange={(next) => {
          if (next) {setEntityMaterial(entityId, slot, next);}
        }}
      />
      {isPaperMaterialId(value) && !disabled ? (
        <FinishSlider
          value={resolveSlotGloss(slotMaterials, slot)}
          onChange={(gloss) => {
            setEntityMaterialGloss(entityId, slot, gloss);
          }}
        />
      ) : null}
    </>
  );
}
