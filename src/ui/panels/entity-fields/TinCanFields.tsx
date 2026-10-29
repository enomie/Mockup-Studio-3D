import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import {
  defaultTinCanParams,
  TIN_CAN_BEAD_COUNT_MAX,
  TIN_CAN_BEAD_COUNT_MIN,
} from '@/scene/asset-tin-can';
import { MATERIAL_ALUMINUM_BRUSHED_ID } from '@/scene/material-ids';
import {
  formatLengthMeters,
  LENGTH_DECIMALS,
  parseLengthMetersInput,
} from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import { GeometryPartsSection } from '@/ui/panels/GeometryPartsSection';
import {
  setAssetScreenImage,
  setAssetSizeScale,
  setTinCanParams,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { formatSizeScale, parseSizeScaleInput } from './field-input-helpers';
import type { PictureFieldsProps } from './entity-fields-types';

export function TinCanFields({
  entity,
  images,
  screenImageFieldId,
}: PictureFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const params = {
    ...defaultTinCanParams(),
    ...entity.tinCanParams,
  };

  return (
    <>
      <SubPanelSection title="Label / Image">
        <ImageSurfaceFields
          entityId={entity.id}
          faceId="label"
          imageId={entity.screenImageId}
          images={images}
          imageLabel="Label"
          imageFieldId={screenImageFieldId}
          onImageChange={(imageId) => { setAssetScreenImage(entity.id, imageId); }}
        />
      </SubPanelSection>

      <SubPanelSection title="Geometries">
        <PanelAxisField
          label="Waves"
          value={params.beadCount}
          format={(value) => String(Math.round(value))}
          parse={(raw) => {
            const trimmed = raw.trim();
            if (trimmed === '') {return null;}
            const n = Number.parseInt(trimmed, 10);
            if (!Number.isFinite(n)) {return null;}
            return n;
          }}
          onChange={(value) => {
            const clamped = Math.min(
              TIN_CAN_BEAD_COUNT_MAX,
              Math.max(TIN_CAN_BEAD_COUNT_MIN, Math.round(value)),
            );
            setTinCanParams(entity.id, { beadCount: clamped });
          }}
        />
        <GeometryPartsSection
          entity={entity}
          materials={materials}
          parts={getGeometryPartsForKind(entity.assetKind)}
        />
      </SubPanelSection>

      <SubPanelSection title="Materials">
        <MaterialSelect
          entityId={entity.id}
          slot="metalMaterialId"
          label="Metal"
          value={slots?.metalMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID}
          materials={materials}
        />
      </SubPanelSection>

      <SubPanelSection title="Dimensions">
        <PanelAxisField
          label="Size"
          value={entity.sizeScale}
          format={formatSizeScale}
          parse={parseSizeScaleInput}
          onChange={(value) => { setAssetSizeScale(entity.id, value); }}
        />
        <PanelAxisField
          label="Radius"
          unit="m"
          value={params.bodyRadiusM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) {
              setTinCanParams(entity.id, { bodyRadiusM: value });
            }
          }}
        />
        <PanelAxisField
          label="Height"
          unit="m"
          value={params.bodyHeightM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) {
              setTinCanParams(entity.id, { bodyHeightM: value });
            }
          }}
        />
      </SubPanelSection>
    </>
  );
}
