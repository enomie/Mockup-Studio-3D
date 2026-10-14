import { parseHexColor, rgbToHex } from '@/colors/color-format';
import { defaultFabricClothParams } from '@/scene/asset-fabric-cloth';
import { formatMmAsMeters, LENGTH_DECIMALS, mmToM, mToMm } from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { MATERIAL_FABRIC_ID } from '@/scene/material-ids';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSelect } from '@/ui/panels/ImageSurfaceFields';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { parseMmInput } from '@/ui/panels/entity-fields/field-input-helpers';
import { setAssetScreenImage, setFabricClothParams } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import type { PictureFieldsProps } from './entity-fields-types';

export function FabricClothFields({
  entity,
  images,
  screenImageFieldId,
}: PictureFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const fabricClothParams = {
    ...defaultFabricClothParams(),
    ...entity.fabricClothParams,
  };
  const borderRgb =
    parseHexColor(fabricClothParams.borderColor) ?? { r: 0.23, g: 0.23, b: 0.23 };

  return (
    <>
      <SubPanelSection title="Image">
        <ImageSelect
          id={screenImageFieldId}
          label="Image"
          value={entity.screenImageId}
          images={images}
          onChange={(imageId) => { setAssetScreenImage(entity.id, imageId); }}
        />
      </SubPanelSection>

      <SubPanelSection title="Material">
        <MaterialSelect
          entityId={entity.id}
          slot="fabricClothMaterialId"
          label="Fabric material"
          value={slots?.fabricClothMaterialId ?? MATERIAL_FABRIC_ID}
          materials={materials}
          excludeKinds={['transmission']}
        />
      </SubPanelSection>

      <SubPanelSection title="Border">
        <PanelCheckbox
          label="Enable"
          checked={fabricClothParams.borderEnabled}
          onChange={(checked) => {
            setFabricClothParams(entity.id, { borderEnabled: checked });
          }}
        />
        {fabricClothParams.borderEnabled ? (
          <>
            <PanelAxisField
              label="Width"
              unit="m"
              value={mToMm(fabricClothParams.borderWidthM)}
              format={(mm) => formatMmAsMeters(mm, LENGTH_DECIMALS)}
              parse={parseMmInput}
              onChange={(mm) => {
                setFabricClothParams(entity.id, { borderWidthM: mmToM(mm) });
              }}
            />
            <ColorPicker
              label="Color"
              value={borderRgb}
              onChange={(color) => {
                setFabricClothParams(entity.id, { borderColor: rgbToHex(color) });
              }}
            />
          </>
        ) : null}
      </SubPanelSection>
    </>
  );
}
