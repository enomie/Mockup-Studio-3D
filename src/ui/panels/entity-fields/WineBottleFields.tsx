import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import {
  defaultWineBottleParams,
  resolveWineBottleProfile,
  type WineBottleLabelSizeMode,
  type WineBottleLabelWrap,
} from '@/scene/asset-wine-bottle';
import { formatLengthMeters, LENGTH_DECIMALS, parseLengthMetersInput } from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { ProfilePickerSection } from '@/ui/panels/ProfilePickerSection';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import { setAssetScreenImage, setKindParams } from '@/ui/store/app-store';
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
    ...defaultWineBottleParams(),
    ...entity.wineBottleParams,
  };
  const hasLabelImage = Boolean(entity.screenImageId);
  // Re-render on profile edits; the registry is kept in sync by the store.
  useAppStore((s) => s.userProfiles);
  const bodyProfile = resolveWineBottleProfile(params.wineBottleBodyProfile).entry;

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
          profilePathName={(slot) => bodyProfile.paths.find((path) => path.slot === slot)?.name}
        />
      </SubPanelSection>

      <BodyProfileSection entityId={entity.id} profileId={params.wineBottleBodyProfile} />

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


function BodyProfileSection({ entityId, profileId }: { entityId: string; profileId: string }) {
  return (
    <ProfilePickerSection
      title="Body profile"
      profileId={profileId}
      resolve={resolveWineBottleProfile}
      missingHint="Profile missing or without a glass path – using Bordeaux."
      onChange={(id) => { setKindParams('wineBottle', entityId, { wineBottleBodyProfile: id }); }}
    />
  );
}
