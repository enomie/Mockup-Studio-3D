import type { ImageAsset } from '@/data/image-assets';
import { defaultBlockParams } from '@/scene/asset-block';
import {
  isBeverageCanAssetKind,
  isBlockAssetKind,
  isCylinderAssetKind,
  isSphereAssetKind,
  isWheelCarAssetKind,
  isFabricClothBakedAssetKind,
  isFabricClothFamilyAssetKind,
  isBookAssetKind,
  isHandheldAssetKind,
  isMonitorAssetKind,
  isPictureAssetKind,
  isPrintAssetKind,
  isTinCanAssetKind,
  isWallAssetKind,
  isWineBottleAssetKind,
  isPenAssetKind,
  isPatchAssetKind,
} from '@/scene/asset-kind-predicates';
import {
  usesPackagingDimensionsPositionFooter,
  usesScenePositionFooter,
} from '@/scene/asset-scene-panel';
import { defaultWallParams } from '@/scene/asset-wall';
import {
  computeFaceSize,
  resolveAssetAspectRatio,
  resolveEntityImagePixels,
} from '@/scene/asset-ui-helpers';
import type { AssetEntity } from '@/scene/entity-types';
import type { AssetKind } from '@/scene/asset-kind';
import { isRigidPrimitiveAssetKind } from '@/scene/rigid-primitive-asset';
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
  TrianglePatchFields,
} from './entity-fields';
import { EntityDimensionsSection } from './entity-fields/EntityDimensionsSection';
import { EntityPositionSection } from './entity-fields/EntityPositionSection';
import { EntityTransformSection } from './entity-fields/EntityTransformSection';

function usesDimensionsPositionFooter(kind: AssetKind): boolean {
  return (
    isRigidPrimitiveAssetKind(kind) ||
    isFabricClothFamilyAssetKind(kind) ||
    isWallAssetKind(kind) ||
    isHandheldAssetKind(kind) ||
    isMonitorAssetKind(kind) ||
    isPrintAssetKind(kind) ||
    isPictureAssetKind(kind) ||
    isBookAssetKind(kind) ||
    isTinCanAssetKind(kind)
  );
}

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

  const showPackagingDimensions = usesPackagingDimensionsPositionFooter(
    entity.assetKind,
  );
  const showPositionFooter = usesScenePositionFooter(entity.assetKind);
  const showMigratedFooter =
    usesDimensionsPositionFooter(entity.assetKind) || showPositionFooter;

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
      ) : isFabricClothFamilyAssetKind(entity.assetKind) ? (
        <FabricClothFields
          entity={entity}
          images={images}
          screenImageFieldId={screenImageFieldId}
          dimensionsReadOnly={isFabricClothBakedAssetKind(entity.assetKind)}
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
      ) : isPatchAssetKind(entity.assetKind) ? (
        <TrianglePatchFields entity={entity} />
      ) : (
        <PictureFields
          entity={entity}
          images={images}
          screenImageFieldId={screenImageFieldId}
        />
      )}

      {showPackagingDimensions ? (
        <EntityDimensionsSection
          entity={entity}
          faceSize={faceSize}
          aspect={aspect}
          mode="sizeScaleAndFace"
        />
      ) : null}

      {showMigratedFooter ? (
        <EntityPositionSection entity={entity} />
      ) : (
        <EntityTransformSection entity={entity} faceSize={faceSize} aspect={aspect} />
      )}
    </div>
  );
}
