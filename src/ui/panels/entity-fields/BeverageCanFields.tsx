import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import { defaultBeverageCanParams } from '@/scene/asset-beverage-can';
import { resolveBeverageCanProfile } from '@/scene/beverage-can-profile-metrics';
import { MATERIAL_ALUMINUM_BRUSHED_ID } from '@/scene/material-ids';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import { GeometryPartsSection } from '@/ui/panels/GeometryPartsSection';
import { setKindParams, setAssetScreenImage } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { ProfilePickerSection } from '@/ui/panels/ProfilePickerSection';
import type { PictureFieldsProps } from './entity-fields-types';

export function BeverageCanFields({
  entity,
  images,
  screenImageFieldId,
}: PictureFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const params = {
    ...defaultBeverageCanParams(),
    ...entity.beverageCanParams,
  };
  // Re-render on profile edits; the registry is kept in sync by the store.
  useAppStore((s) => s.userProfiles);
  const profile = resolveBeverageCanProfile(params.canBodyProfile).entry;
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
          profilePathName={(slot) => profile.paths.find((path) => path.slot === slot)?.name}
        />
      </SubPanelSection>

      <ProfilePickerSection
        title="Body profile"
        profileId={params.canBodyProfile}
        resolve={resolveBeverageCanProfile}
        missingHint="Profile missing or without a body path – using Can 330 ml classic."
        onChange={(canBodyProfile) => { setKindParams('beverageCan', entity.id, { canBodyProfile }); }}
      />

      <SubPanelSection title="Materials">
        <MaterialSelect
          entityId={entity.id}
          slot="metalMaterialId"
          label="Metal"
          value={slots?.metalMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID}
          materials={materials}
        />
      </SubPanelSection>
    </>
  );
}
