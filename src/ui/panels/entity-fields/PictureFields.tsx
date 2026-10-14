import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { GeometryPartsSection } from '@/ui/panels/GeometryPartsSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import { setAssetScreenImage } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import type { PictureFieldsProps } from './entity-fields-types';

export function PictureFields({
  entity,
  images,
  screenImageFieldId,
}: PictureFieldsProps) {
  const materials = useAppStore((s) => s.materials);

  return (
    <>
      <SubPanelSection title="Geometries">
        <GeometryPartsSection
          entity={entity}
          materials={materials}
          parts={getGeometryPartsForKind(entity.assetKind)}
        />
      </SubPanelSection>

      <SubPanelSection title="Screen / Image">
        <ImageSurfaceFields
          entityId={entity.id}
          faceId="front"
          imageId={entity.screenImageId}
          images={images}
          imageLabel="Image"
          imageFieldId={screenImageFieldId}
          onImageChange={(imageId) => { setAssetScreenImage(entity.id, imageId); }}
        />
      </SubPanelSection>
    </>
  );
}
