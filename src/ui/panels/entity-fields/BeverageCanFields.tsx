import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import {
  defaultBeverageCanParams,
  type BeverageCanBodyProfile,
} from '@/scene/asset-beverage-can';
import { MATERIAL_ALUMINUM_BRUSHED_ID } from '@/scene/material-ids';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import { GeometryPartsSection } from '@/ui/panels/GeometryPartsSection';
import { setAssetScreenImage, setBeverageCanParams } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { PanelSelect } from '@/ui/components/PanelSelect';
import type { PictureFieldsProps } from './entity-fields-types';

export function BeverageCanFields({
  entity,
  images,
  screenImageFieldId,
}: PictureFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const params = {
    ...defaultBeverageCanParams('standard'),
    ...entity.beverageCanParams,
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
        <GeometryPartsSection
          entity={entity}
          materials={materials}
          parts={getGeometryPartsForKind(entity.assetKind)}
        />
      </SubPanelSection>

      <SubPanelSection title="Body profile">
        <PanelSelect
          label="Profile"
          value={params.canBodyProfile}
          options={[
            { value: 'standard', label: 'Standard (330 ml)' },
            { value: 'sleek', label: 'Sleek (330 ml)' },
          ]}
          onChange={(value) => { setBeverageCanParams(entity.id, {
              canBodyProfile: value as BeverageCanBodyProfile,
            }); }
          }
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
    </>
  );
}
