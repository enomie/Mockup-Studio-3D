import { NORMALIZED_DECIMALS, NORMALIZED_STEP } from '@/units/normalized';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { RangeSlider } from '@/ui/components/RangeSlider';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  setGroundMaterialId,
  setGroundMirrorEnabled,
  setGroundMirrorOpacity,
  setGroundReceiveShadow,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

type GroundSettingsSectionProps = {
  disabled?: boolean;
};

export function GroundSettingsSection({ disabled = false }: GroundSettingsSectionProps) {
  const ground = useAppStore((s) => s.ground);
  const materials = useAppStore((s) => s.materials);

  const materialOptions = materials.map((material) => ({
    value: material.id,
    label: material.name,
  }));

  return (
    <>
      <PanelSelect
        label="Material"
        ariaLabel="Ground material"
        value={ground.materialId}
        disabled={disabled}
        options={materialOptions}
        onChange={(next) => {
          if (next) setGroundMaterialId(next);
        }}
      />

      <PanelCheckbox
        label="Receive shadows"
        checked={ground.receiveShadow}
        disabled={disabled}
        onChange={setGroundReceiveShadow}
      />

      <SubPanelSection title="Mirror">
        <PanelCheckbox
          label="Mirror floor"
          checked={ground.mirrorEnabled}
          disabled={disabled}
          onChange={setGroundMirrorEnabled}
        />
        <RangeSlider
          label="Mirror opacity"
          min={0}
          max={1}
          step={NORMALIZED_STEP}
          value={ground.mirrorOpacity}
          valueInputLabel="Opacity"
          valueInputDecimals={NORMALIZED_DECIMALS}
          disabled={disabled || !ground.mirrorEnabled}
          onChange={setGroundMirrorOpacity}
        />
      </SubPanelSection>
    </>
  );
}
