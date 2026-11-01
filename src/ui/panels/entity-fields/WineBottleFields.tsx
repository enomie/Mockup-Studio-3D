import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import { Copy, PenLine } from 'lucide-react';
import {
  defaultWineBottleParams,
  resolveWineBottleProfile,
  type WineBottleLabelSizeMode,
  type WineBottleLabelWrap,
} from '@/scene/asset-wine-bottle';
import { formatLengthMeters, LENGTH_DECIMALS, parseLengthMetersInput } from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { Icon } from '@/ui/components/Icon';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { allProfiles, profileUrl, type ProfileEntry } from '@/scene/profile-library';
import { canonicalProfileId } from '@/scene/profile-registry';
import { sortBuiltinThenUserByName } from '@/ui/utils/library-list-order';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import {
  duplicateProfile,
  editProfileFromAsset,
  setAssetScreenImage,
  setKindParams,
} from '@/ui/store/app-store';
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

function profileOptionLabel(entry: ProfileEntry): string {
  return entry.source === 'builtin' && entry.usedBy ? `${entry.name} · ${entry.usedBy}` : entry.name;
}

function BodyProfileSection({ entityId, profileId }: { entityId: string; profileId: string }) {
  const userProfiles = useAppStore((s) => s.userProfiles);
  const value = canonicalProfileId(profileId);
  const { entry, missing } = resolveWineBottleProfile(value);
  const profiles = sortBuiltinThenUserByName(
    allProfiles(userProfiles),
    (profile) => profile.name,
    (profile) => profile.source === 'builtin',
  );
  const options = profiles.map((profile) => ({ value: profile.id, label: profileOptionLabel(profile) }));
  if (missing) {
    options.unshift({ value, label: 'Missing profile' });
  }
  const setProfile = (id: string) => {
    setKindParams('wineBottle', entityId, { wineBottleBodyProfile: id });
  };

  return (
    <SubPanelSection title="Body profile">
      <div className="body-profile">
        <span className="tile__thumb tile__thumb--profile">
          <img src={profileUrl(entry)} alt="" />
        </span>
        <div className="body-profile__select">
          <PanelSelect label="Profile" value={value} options={options} onChange={setProfile} />
        </div>
      </div>
      {missing ? (
        <p className="profile-hint">Profile missing or without a glass path – using Bordeaux.</p>
      ) : null}
      <div className="material-editor-actions">
        {entry.source === 'user' && !missing ? (
          <button type="button" className="btn" onClick={() => { editProfileFromAsset(entry.id); }}>
            <Icon icon={PenLine} size={16} strokeWidth={1.75} />
            Edit profile
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => {
              const copyId = duplicateProfile(entry.id);
              if (copyId) {
                setProfile(copyId);
                editProfileFromAsset(copyId);
              }
            }}
          >
            <Icon icon={Copy} size={16} strokeWidth={1.75} />
            Duplicate & edit
          </button>
        )}
      </div>
    </SubPanelSection>
  );
}
