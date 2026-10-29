import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import {
  defaultPenParams,
  type PenBodyProfile,
} from '@/scene/asset-pen';
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
import { PanelSelect } from '@/ui/components/PanelSelect';
import type { PictureFieldsProps } from './entity-fields-types';

export function PenFields({
  entity,
  images,
  screenImageFieldId,
}: PictureFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const params = {
    ...defaultPenParams('marker'),
    ...entity.penParams,
  };

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
        />
      </SubPanelSection>

      <SubPanelSection title="Body profile">
        <PanelSelect
          label="Profile"
          value={params.penBodyProfile}
          options={[
            { value: 'marker', label: 'Marker' },
            { value: 'fountain', label: 'Fountain pen' },
          ]}
          onChange={(value) => { setKindParams('pen', entity.id, {
              penBodyProfile: value as PenBodyProfile,
            }); }
          }
        />
      </SubPanelSection>

      <SubPanelSection title="Materials">
        <MaterialSelect
          entityId={entity.id}
          slot="capMaterialId"
          label="Cap"
          value={slots?.capMaterialId ?? MATERIAL_PLASTIC_MATTE_ID}
          materials={materials}
        />
        <MaterialSelect
          entityId={entity.id}
          slot="ringMaterialId"
          label="Ring"
          value={slots?.ringMaterialId ?? MATERIAL_ALUMINUM_BRUSHED_ID}
          materials={materials}
        />
        <MaterialSelect
          entityId={entity.id}
          slot="bodyMaterialId"
          label="Body"
          value={slots?.bodyMaterialId ?? MATERIAL_PLASTIC_SMOOTH_ID}
          materials={materials}
        />
      </SubPanelSection>
    </>
  );
}
