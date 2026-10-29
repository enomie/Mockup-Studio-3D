import {
  defaultWheelCarParams,
  WHEEL_CAR_SVG_TIRE_WIDTH_MM,
  wheelCarSizeRatio,
  wheelCarUniformScale,
} from '@/scene/asset-wheel-car';
import {
  MATERIAL_CHROME_ID,
  MATERIAL_PLASTIC_MATTE_ID,
} from '@/scene/material-ids';
import { formatLengthMeters, LENGTH_DECIMALS, parseLengthMetersInput } from '@/units/length';
import { noop } from '@/utils/noop';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { setWheelCarParams } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { formatSizeScale, parseSizeScaleInput } from './field-input-helpers';
import { RigidBodyPhysicsFields } from './RigidBodyPhysicsFields';
import type { WheelCarFieldsProps } from './entity-fields-types';

export function WheelCarFields({ entity }: WheelCarFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const wheelCarParams = {
    ...defaultWheelCarParams(),
    ...entity.wheelCarParams,
  };
  const defaultOuterRadiusM = defaultWheelCarParams().outerRadiusM;
  const diameterM = wheelCarParams.outerRadiusM * 2;
  const sizeRatio = wheelCarSizeRatio(wheelCarParams.outerRadiusM);
  const derivedTireWidthM =
    (WHEEL_CAR_SVG_TIRE_WIDTH_MM / 1000) * wheelCarUniformScale(wheelCarParams.outerRadiusM);

  const setOuterRadiusFromDiameter = (widthM: number): void => {
    if (widthM > 0) {
      setWheelCarParams(entity.id, { outerRadiusM: widthM / 2 });
    }
  };

  return (
    <>
      <SubPanelSection title="Materials">
        <MaterialSelect
          entityId={entity.id}
          slot="tireMaterialId"
          label="Tire"
          materials={materials}
          value={slots?.tireMaterialId ?? MATERIAL_PLASTIC_MATTE_ID}
        />
        <MaterialSelect
          entityId={entity.id}
          slot="rimMaterialId"
          label="Rim"
          materials={materials}
          value={slots?.rimMaterialId ?? MATERIAL_CHROME_ID}
        />
      </SubPanelSection>

      <RigidBodyPhysicsFields entity={entity} />

      <SubPanelSection title="Dimensions">
        <PanelAxisField
          label="Size"
          value={sizeRatio}
          format={formatSizeScale}
          parse={parseSizeScaleInput}
          onChange={(value) => {
            if (value > 0) {
              setWheelCarParams(entity.id, { outerRadiusM: defaultOuterRadiusM * value });
            }
          }}
        />
        <PanelAxisField
          label="Width"
          unit="m"
          value={diameterM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={setOuterRadiusFromDiameter}
        />
        <PanelAxisField
          label="Height"
          unit="m"
          value={diameterM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={setOuterRadiusFromDiameter}
        />
        <PanelAxisField
          label="Tire width (from SVG)"
          unit="m"
          value={derivedTireWidthM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={noop}
          disabled
        />
        <PanelAxisField
          label="Rim inset"
          unit="m"
          value={wheelCarParams.rimInsetM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value >= 0) {setWheelCarParams(entity.id, { rimInsetM: value });}
          }}
        />
        <PanelAxisField
          label="Hub radius"
          unit="m"
          value={wheelCarParams.hubRadiusM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) {setWheelCarParams(entity.id, { hubRadiusM: value });}
          }}
        />
        <PanelAxisField
          label="Hub depth"
          unit="m"
          value={wheelCarParams.hubDepthM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) {setWheelCarParams(entity.id, { hubDepthM: value });}
          }}
        />
      </SubPanelSection>
    </>
  );
}
