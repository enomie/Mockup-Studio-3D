import { defaultSphereParams } from '@/scene/asset-sphere';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
import { formatLengthMeters, LENGTH_DECIMALS, parseLengthMetersInput } from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { setKindParams } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { RigidBodyPhysicsFields } from './RigidBodyPhysicsFields';
import type { SphereFieldsProps } from './entity-fields-types';

export function SphereFields({ entity }: SphereFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const sphereParams = {
    ...defaultSphereParams(),
    ...entity.sphereParams,
  };

  return (
    <>
      <SubPanelSection title="Material">
        <MaterialSelect
          entityId={entity.id}
          slot="sphereMaterialId"
          materials={materials}
          value={slots?.sphereMaterialId ?? MATERIAL_PAPER_ID}
        />
      </SubPanelSection>

      <RigidBodyPhysicsFields entity={entity} />

      <SubPanelSection title="Dimensions">
        <PanelAxisField
          label="Radius"
          unit="m"
          value={sphereParams.radiusM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) {setKindParams('sphere', entity.id, { radiusM: value });}
          }}
        />
      </SubPanelSection>
    </>
  );
}
