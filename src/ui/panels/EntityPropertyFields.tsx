import type { ImageAsset } from '@/data/image-assets';
import { defaultBlockParams } from '@/scene/asset-block';
import {
  isBeverageCanAssetKind,
  isBlockAssetKind,
  isCylinderAssetKind,
  isSphereAssetKind,
  isWheelCarAssetKind,
  isFabricClothAssetKind,
  isBookAssetKind,
  isHandheldAssetKind,
  isMonitorAssetKind,
  isPrintAssetKind,
  isTinCanAssetKind,
  isWallAssetKind,
  isWineBottleAssetKind,
  isPenAssetKind,
} from '@/scene/asset-kind-predicates';
import { defaultWallParams } from '@/scene/asset-wall';
import {
  computeFaceSize,
  resolveAssetAspectRatio,
  resolveEntityImagePixels,
} from '@/scene/asset-ui-helpers';
import type { AssetEntity } from '@/scene/entity-types';
import {
  BeverageCanFields,
  BlockFields,
  CylinderFields,
  SphereFields,
  WheelCarFields,
  FabricClothFields,
  BookFields,
  HandheldFields,
  MonitorFields,
  PictureFields,
  PrintFields,
  TinCanFields,
  WallFields,
  WineBottleFields,
  PenFields,
} from './entity-fields';
import { EntityTransformSection } from './entity-fields/EntityTransformSection';

interface EntityPropertyFieldsProps {
  entity: AssetEntity;
  images: ImageAsset[];
  screenImageFieldId?: string;
}

export function EntityPropertyFields({
  entity,
  images,
  screenImageFieldId,
}: EntityPropertyFieldsProps) {
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
    <div className="scene-entity-block__body panel-stack">
      {isPrintAssetKind(entity.assetKind) ? (
        <PrintFields
          entity={entity}
          images={images}
          fieldIdPrefix={screenImageFieldId}
        />
      ) : isHandheldAssetKind(entity.assetKind) ? (
        <HandheldFields
          entity={entity}
          images={images}
          screenImageFieldId={screenImageFieldId}
        />
      ) : isMonitorAssetKind(entity.assetKind) ? (
        <MonitorFields
          entity={entity}
          images={images}
          screenImageFieldId={screenImageFieldId}
        />
      ) : isWallAssetKind(entity.assetKind) ? (
        <WallFields
          entity={entity}
          images={images}
          screenImageFieldId={screenImageFieldId}
        />
      ) : isBlockAssetKind(entity.assetKind) ? (
        <BlockFields entity={entity} />
      ) : isCylinderAssetKind(entity.assetKind) ? (
        <CylinderFields entity={entity} />
      ) : isSphereAssetKind(entity.assetKind) ? (
        <SphereFields entity={entity} />
      ) : isWheelCarAssetKind(entity.assetKind) ? (
        <WheelCarFields entity={entity} />
      ) : isFabricClothAssetKind(entity.assetKind) ? (
        <FabricClothFields
          entity={entity}
          images={images}
          screenImageFieldId={screenImageFieldId}
        />
      ) : isBookAssetKind(entity.assetKind) ? (
        <BookFields
          entity={entity}
          images={images}
          screenImageFieldId={screenImageFieldId}
        />
      ) : isBeverageCanAssetKind(entity.assetKind) ? (
        <BeverageCanFields
          entity={entity}
          images={images}
          screenImageFieldId={screenImageFieldId}
        />
      ) : isTinCanAssetKind(entity.assetKind) ? (
        <TinCanFields
          entity={entity}
          images={images}
          screenImageFieldId={screenImageFieldId}
        />
      ) : isWineBottleAssetKind(entity.assetKind) ? (
        <WineBottleFields
          entity={entity}
          images={images}
          screenImageFieldId={screenImageFieldId}
        />
      ) : isPenAssetKind(entity.assetKind) ? (
        <PenFields
          entity={entity}
          images={images}
          screenImageFieldId={screenImageFieldId}
        />
      ) : (
        <PictureFields
          entity={entity}
          images={images}
          screenImageFieldId={screenImageFieldId}
        />
      )}

      <EntityTransformSection entity={entity} faceSize={faceSize} aspect={aspect} />
    </div>
  );
}
