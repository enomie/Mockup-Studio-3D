import { getGeometryPartsForKind } from '@/scene/asset-kind-registry';
import {
  clampOuterEdgeRadiusMm,
  defaultHandheldParams,
  resolveBodyDepthMm,
} from '@/scene/asset-handheld';
import { formatMmAsMeters } from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import { setAssetScreenImage, setHandheldParams } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { GeometryPartsSection } from '@/ui/panels/GeometryPartsSection';
import { parseMmInput } from './field-input-helpers';
import type { HandheldFieldsProps } from './entity-fields-types';

export function HandheldFields({
  entity,
  images,
  screenImageFieldId,
}: HandheldFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const params = {
    ...defaultHandheldParams(entity.assetKind),
    ...entity.params,
  };
  return (
    <>
      <SubPanelSection title="Device">
        <PanelAxisField
          label="Corner radius"
          unit="m"
          value={params.screenCornerRadiusMm}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(value) => {
            setHandheldParams(entity.id, { screenCornerRadiusMm: value });
          }}
        />
        <PanelAxisField
          label="Bezel width"
          unit="m"
          value={params.bezelWidthMm}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(value) => {
            setHandheldParams(entity.id, { bezelWidthMm: value });
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
            setHandheldParams(entity.id, {
              outerEdgeRadiusMm: clampOuterEdgeRadiusMm(value, bodyDepthMm),
            });
          }}
        />
      </SubPanelSection>

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
