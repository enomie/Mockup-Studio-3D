import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import { defaultBlockParams } from '@/scene/asset-block';
import { clampOuterEdgeRadiusMm, resolveBodyDepthMm } from '@/scene/asset-handheld';
import {
  defaultMonitorParams,
  MONITOR_DISPLAY_TILT_MAX_DEG,
  MONITOR_DISPLAY_TILT_MIN_DEG,
} from '@/scene/asset-monitor';
import {
  computeFaceSize,
  resolveAssetAspectRatio,
  resolveEntityImagePixels,
} from '@/scene/asset-ui-helpers';
import { defaultWallParams } from '@/scene/asset-wall';
import { formatMmAsMeters } from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import { setKindParams, setAssetScreenImage } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { GeometryPartsSection } from '@/ui/panels/GeometryPartsSection';
import { AssetDimensionsFields } from '@/ui/panels/entity-fields/EntityDimensionsSection';
import { parseMmInput } from './field-input-helpers';
import type { MonitorFieldsProps } from './entity-fields-types';

export function MonitorFields({
  entity,
  images,
  screenImageFieldId,
}: MonitorFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const params = {
    ...defaultMonitorParams(),
    ...entity.params,
  };
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
        <PanelAxisField
          label="Corner radius"
          unit="m"
          value={params.screenCornerRadiusMm}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(value) => {
            setKindParams('monitor', entity.id, { screenCornerRadiusMm: value });
          }}
        />
        <PanelAxisField
          label="Bezel width"
          unit="m"
          value={params.bezelWidthMm}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(value) => {
            setKindParams('monitor', entity.id, { bezelWidthMm: value });
          }}
        />
        <PanelAxisField
          label="Edge roundness"
          unit="m"
          value={params.outerEdgeRadiusMm}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(value) => {
            const bodyDepthMm = resolveBodyDepthMm(entity.assetKind, params);
            setKindParams('monitor', entity.id, {
              outerEdgeRadiusMm: clampOuterEdgeRadiusMm(value, bodyDepthMm),
            });
          }}
        />
        <PanelAxisField
          label="Display tilt"
          unit="°"
          value={params.displayTiltDeg}
          format={(value) => String(value)}
          parse={(text) => Number.parseFloat(text)}
          onChange={(value) => {
            const clamped = Math.max(
              MONITOR_DISPLAY_TILT_MIN_DEG,
              Math.min(MONITOR_DISPLAY_TILT_MAX_DEG, value),
            );
            setKindParams('monitor', entity.id, { displayTiltDeg: clamped });
          }}
        />
        <PanelAxisField
          label="Mount height"
          unit="m"
          value={params.displayMountHeightMm}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(value) => {
            const clamped = Math.max(
              0,
              Math.min(params.standFootHeightMm, value),
            );
            setKindParams('monitor', entity.id, { displayMountHeightMm: clamped });
          }}
        />
      </SubPanelSection>
    </>
  );
}
