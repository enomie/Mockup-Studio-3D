import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import {
  defaultWineBottleParams,
  type WineBottleBodyProfile,
  type WineBottleLabelSizeMode,
  type WineBottleLabelWrap,
} from '@/scene/asset-wine-bottle';
import { formatLengthMeters, LENGTH_DECIMALS, parseLengthMetersInput } from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import { setKindParams, setAssetScreenImage } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { GeometryPartsSection } from '@/ui/panels/GeometryPartsSection';
import type { PictureFieldsProps } from './entity-fields-types';

export function WineBottleFields({
  entity,
  images,
  screenImageFieldId,
}: PictureFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const params = {
    ...defaultWineBottleParams('bordeaux'),
    ...entity.wineBottleParams,
  };
  const hasLabelImage = Boolean(entity.screenImageId);

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
        <GeometryPartsSection
          entity={entity}
          materials={materials}
          parts={getGeometryPartsForKind(entity.assetKind)}
        />
      </SubPanelSection>

      <SubPanelSection title="Body profile">
        <PanelSelect
          label="Profile"
          value={params.wineBottleBodyProfile}
          options={[
            { value: 'bordeaux', label: 'Bordeaux' },
            { value: 'alsace', label: 'Alsace' },
            { value: 'sparkling', label: 'Sparkling' },
          ]}
          onChange={(value) => { setKindParams('wineBottle', entity.id, {
              wineBottleBodyProfile: value as WineBottleBodyProfile,
            }); }
          }
        />
      </SubPanelSection>

      <SubPanelSection title="Capsule">
        <PanelAxisField
          label="Foil height"
          unit="m"
          value={params.capsuleFoilHeightM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => { setKindParams('wineBottle', entity.id, { capsuleFoilHeightM: value }); }
          }
        />
        <PanelAxisField
          label="Disc height"
          unit="m"
          value={params.capsuleDiscHeightM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => { setKindParams('wineBottle', entity.id, { capsuleDiscHeightM: value }); }
          }
        />
      </SubPanelSection>

      <SubPanelSection title="Label placement">
        <PanelSelect
          label="Wrap"
          value={params.labelWrap}
          options={[
            { value: 'partial', label: 'Partial (front)' },
            { value: 'full', label: 'Full (360°)' },
          ]}
          onChange={(value) => { setKindParams('wineBottle', entity.id, {
              labelWrap: value as WineBottleLabelWrap,
            }); }
          }
        />
        <PanelSelect
          label="Size mode"
          value={params.labelSizeMode}
          options={[
            { value: 'height', label: 'Height' },
            { value: 'width', label: 'Width' },
          ]}
          onChange={(value) => { setKindParams('wineBottle', entity.id, {
              labelSizeMode: value as WineBottleLabelSizeMode,
            }); }
          }
          disabled={!hasLabelImage}
        />
        <PanelAxisField
          label={params.labelSizeMode === 'height' ? 'Label height' : 'Label width'}
          unit="m"
          value={params.labelSizeM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => { setKindParams('wineBottle', entity.id, { labelSizeM: value }); }}
          disabled={!hasLabelImage}
        />
        <PanelAxisField
          label="From bottom"
          unit="m"
          value={params.labelBottomOffsetM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => { setKindParams('wineBottle', entity.id, { labelBottomOffsetM: value }); }
          }
          disabled={!hasLabelImage}
        />
      </SubPanelSection>
    </>
  );
}
