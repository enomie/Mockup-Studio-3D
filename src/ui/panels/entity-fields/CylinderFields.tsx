import { defaultCylinderParams } from '@/scene/asset-cylinder';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
import { formatLengthMeters, formatMmAsMeters, LENGTH_DECIMALS, parseLengthMetersInput } from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { setCylinderParams } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { parseMmInput } from './field-input-helpers';
import { RigidBodyPhysicsFields } from './RigidBodyPhysicsFields';
import type { CylinderFieldsProps } from './entity-fields-types';

export function CylinderFields({ entity }: CylinderFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const cylinderParams = {
    ...defaultCylinderParams(),
    ...entity.cylinderParams,
  };

  return (
    <>
      <SubPanelSection title="Material">
        <MaterialSelect
          entityId={entity.id}
          slot="cylinderMaterialId"
          materials={materials}
          value={slots?.cylinderMaterialId ?? MATERIAL_PAPER_ID}
        />
      </SubPanelSection>

      <RigidBodyPhysicsFields entity={entity} />

      <SubPanelSection title="Dimensions">
        <PanelAxisField
          label="Radius"
          unit="m"
          value={cylinderParams.radiusM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) {setCylinderParams(entity.id, { radiusM: value });}
          }}
        />
        <PanelAxisField
          label="Height"
          unit="m"
          value={cylinderParams.heightM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) {setCylinderParams(entity.id, { heightM: value });}
          }}
        />
        <PanelAxisField
          label="Corner radius"
          unit="m"
          value={cylinderParams.cornerRadiusMm}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(value) => {
            if (value >= 0) {setCylinderParams(entity.id, { cornerRadiusMm: value });}
          }}
        />
      </SubPanelSection>
    </>
  );
}
