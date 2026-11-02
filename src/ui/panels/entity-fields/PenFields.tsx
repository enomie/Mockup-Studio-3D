import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import { defaultPenParams, resolvePenProfile } from '@/scene/asset-pen';
import {
  MATERIAL_ALUMINUM_BRUSHED_ID,
  MATERIAL_PLASTIC_MATTE_ID,
  MATERIAL_PLASTIC_SMOOTH_ID,
} from '@/scene/material-ids';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import { GeometryPartsSection } from '@/ui/panels/GeometryPartsSection';
import { setKindParams, setAssetScreenImage } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { ProfilePickerSection } from '@/ui/panels/ProfilePickerSection';
import type { PictureFieldsProps } from './entity-fields-types';

export function PenFields({
  entity,
  images,
  screenImageFieldId,
}: PictureFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const params = {
    ...defaultPenParams(),
    ...entity.penParams,
  };
  // Re-render on profile edits; the registry is kept in sync by the store.
  useAppStore((s) => s.userProfiles);
  const profile = resolvePenProfile(params.penBodyProfile).entry;
  const pathName = (slot: number, fallback: string) =>
    profile.paths.find((path) => path.slot === slot)?.name ?? fallback;

  return (
    <>
      <SubPanelSection title="Label / Image">
        <ImageSurfaceFields
          entityId={entity.id}
          faceId="label"
          imageId={entity.screenImageId}
          images={images}
          imageLabel="Body wrap"
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
        profileId={params.penBodyProfile}
        resolve={resolvePenProfile}
        missingHint="Profile missing or without a body path – using Marker."
        onChange={(penBodyProfile) => { setKindParams('pen', entity.id, { penBodyProfile }); }}
      />

      <SubPanelSection title="Materials">
        <MaterialSelect
          entityId={entity.id}
          slot="capMaterialId"
          label={pathName(0, 'Cap')}
          value={slots?.capMaterialId ?? MATERIAL_PLASTIC_MATTE_ID}
          materials={materials}
        />
        <MaterialSelect
          entityId={entity.id}
          slot="ringMaterialId"
          label={pathName(1, 'Ring')}
          value={slots?.ringMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID}
          materials={materials}
        />
        <MaterialSelect
          entityId={entity.id}
          slot="bodyMaterialId"
          label={pathName(2, 'Body')}
          value={slots?.bodyMaterialId ?? MATERIAL_PLASTIC_SMOOTH_ID}
          materials={materials}
        />
      </SubPanelSection>
    </>
  );
}
