import { defaultBlockParams } from '@/scene/asset-block';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
import { formatLengthMeters, formatMmAsMeters, LENGTH_DECIMALS, parseLengthMetersInput } from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { setBlockParams } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { parseMmInput } from './field-input-helpers';
import type { BlockFieldsProps } from './entity-fields-types';

export function BlockFields({ entity }: BlockFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const blockParams = {
    ...defaultBlockParams(),
    ...entity.blockParams,
  };

  return (
    <>
      <SubPanelSection title="Dimensions">
        <PanelAxisField
          label="Width"
          unit="m"
          value={blockParams.widthM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) setBlockParams(entity.id, { widthM: value });
          }}
        />
        <PanelAxisField
          label="Height"
          unit="m"
          value={blockParams.heightM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) setBlockParams(entity.id, { heightM: value });
          }}
        />
        <PanelAxisField
          label="Depth"
          unit="m"
          value={blockParams.depthM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) setBlockParams(entity.id, { depthM: value });
          }}
        />
        <PanelAxisField
          label="Corner radius"
          unit="m"
          value={blockParams.cornerRadiusMm}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(value) => {
            if (value >= 0) setBlockParams(entity.id, { cornerRadiusMm: value });
          }}
        />
      </SubPanelSection>

      <SubPanelSection title="Material">
        <MaterialSelect
          entityId={entity.id}
          slot="blockMaterialId"
          label="Block material"
          value={slots?.blockMaterialId ?? MATERIAL_PAPER_ID}
          materials={materials}
        />
      </SubPanelSection>
    </>
  );
}
