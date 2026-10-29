import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import { defaultBlockParams } from '@/scene/asset-block';
import {
  computeFaceSize,
  resolveAssetAspectRatio,
  resolveEntityImagePixels,
} from '@/scene/asset-ui-helpers';
import { defaultWallParams } from '@/scene/asset-wall';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { GeometryPartsSection } from '@/ui/panels/GeometryPartsSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import { setAssetScreenImage } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { AssetDimensionsFields } from '@/ui/panels/entity-fields/EntityDimensionsSection';
import type { PictureFieldsProps } from './entity-fields-types';

export function PictureFields({
  entity,
  images,
  screenImageFieldId,
}: PictureFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const imagePixels = resolveEntityImagePixels(entity, images);
  const aspect = resolveAssetAspectRatio(
    entity.assetKind,
    imagePixels.width,
    imagePixels.height,
    entity,
  );
  const faceSize = computeFaceSize(
    entity.assetKind,
    imagePixels.width,
    imagePixels.height,
    entity.sizeScale,
    entity.wallParams ?? defaultWallParams(),
    entity.blockParams ?? defaultBlockParams(),
    entity,
  );

  return (
    <>
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

      <SubPanelSection title="Geometries">
        <GeometryPartsSection
          entity={entity}
          materials={materials}
          parts={getGeometryPartsForKind(entity.assetKind)}
        />
      </SubPanelSection>

      <SubPanelSection title="Dimensions">
        <AssetDimensionsFields
          entity={entity}
          faceSize={faceSize}
          aspect={aspect}
          mode="faceOnly"
        />
      </SubPanelSection>
    </>
  );
}
