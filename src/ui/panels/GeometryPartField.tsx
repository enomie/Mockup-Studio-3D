import type { MaterialEntitySlot, MaterialPreset } from '@/scene/entity-types';
import type { AssetGeometryPart } from '@/scene/geometry-visibility';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { setGeometryVisible } from '@/ui/store/app-store';
import { MaterialSelect } from './MaterialSelect';

interface GeometryPartFieldProps {
  entityId: string;
  part: AssetGeometryPart;
  label: string;
  slot: MaterialEntitySlot;
  visible: boolean;
  materialId: string;
  materials: MaterialPreset[];
  id?: string;
}

export function GeometryPartField({
  entityId,
  part,
  label,
  slot,
  visible,
  materialId,
  materials,
  id,
}: GeometryPartFieldProps) {
  const selectId = id ? `${id}-material` : undefined;

  return (
    <div className="geometry-part-row">
      <PanelCheckbox
        label={label}
        checked={visible}
        onChange={(checked) => { setGeometryVisible(entityId, part, checked); }}
      />
      <MaterialSelect
        entityId={entityId}
        slot={slot}
        ariaLabel={`${label} material`}
        value={materialId}
        materials={materials}
        id={selectId}
        disabled={!visible}
      />
    </div>
  );
}
