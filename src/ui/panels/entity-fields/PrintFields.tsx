import type { Rgb } from '@/colors/rgb';
import { defaultBlockParams } from '@/scene/asset-block';
import { faceLabel, NEAR_WHITE_SIDE_COLOR } from '@/scene/asset-faces';
import { defaultPrintParams } from '@/scene/asset-print';
import {
  computeFaceSize,
  resolveAssetAspectRatio,
  resolveEntityImagePixels,
} from '@/scene/asset-ui-helpers';
import { defaultWallParams } from '@/scene/asset-wall';
import type { AssetFaceId } from '@/scene/entity-types';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
import { TINT_NEUTRAL } from '@/scene/material-types';
import { formatLengthMeters, formatMmAsMeters, LENGTH_DECIMALS, parseLengthMetersInput } from '@/units/length';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import { setKindParams, setAssetDepth, setAssetFace, setAssetScreenImage, setFaceTint } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { AssetDimensionsFields } from '@/ui/panels/entity-fields/EntityDimensionsSection';
import { parseMmInput, SIDE_FACE_IDS } from './field-input-helpers';
import type { PrintFieldsProps } from './entity-fields-types';

export function PrintFields({
  entity,
  images,
  fieldIdPrefix,
}: PrintFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const faces = entity.faces;
  if (!faces) {return null;}

  const frontImageId =
    faces.front.mode === 'image' ? faces.front.imageId : entity.screenImageId;
  const back = faces.back;
  const depth = entity.depth ?? 0;
  const printParams = {
    ...defaultPrintParams(),
    ...entity.printParams,
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

  const getTint = (faceId: AssetFaceId): Rgb => {
    if (slots?.faceTints?.[faceId]) {
      return slots.faceTints[faceId];
    }
    if (faceId === 'back' && back.mode === 'color') {
      return back.color;
    }
    if (SIDE_FACE_IDS.includes(faceId)) {
      const content = faces[faceId];
      if (content.mode === 'color') {
        return content.color;
      }
    }
    return TINT_NEUTRAL;
  };

  const updateBackMode = (mode: 'color' | 'image'): void => {
    if (mode === 'color') {
      const color = back.mode === 'color' ? back.color : { ...NEAR_WHITE_SIDE_COLOR };
      setAssetFace(entity.id, 'back', { mode: 'color', color });
      setFaceTint(entity.id, 'back', color);
      return;
    }

    const imageId = back.mode === 'image' ? back.imageId : null;
    setAssetFace(entity.id, 'back', { mode: 'image', imageId });
  };

  const backImageId = fieldIdPrefix ? `${fieldIdPrefix}-back` : undefined;

  return (
    <>
      <SubPanelSection title="Faces">
        <ImageSurfaceFields
          entityId={entity.id}
          faceId="front"
          imageId={frontImageId}
          images={images}
          imageLabel="Front image"
          imageFieldId={fieldIdPrefix}
          onImageChange={(imageId) => { setAssetScreenImage(entity.id, imageId); }}
        />

        <PanelSelect
          label="Back"
          id={backImageId ? `${backImageId}-mode` : undefined}
          value={back.mode}
          options={[
            { value: 'color', label: 'Color' },
            { value: 'image', label: 'Image' },
          ]}
          onChange={(next) => { updateBackMode(next as 'color' | 'image'); }}
        />

        {back.mode === 'color' ? (
          <ColorPicker
            label="Back tint"
            value={getTint('back')}
            onChange={(color) => { setFaceTint(entity.id, 'back', color); }}
          />
        ) : (
          <ImageSurfaceFields
            entityId={entity.id}
            faceId="back"
            imageId={back.imageId}
            images={images}
            imageLabel="Back image"
            imageFieldId={backImageId}
            onImageChange={(imageId) => {
              setAssetFace(entity.id, 'back', { mode: 'image', imageId });
            }}
          />
        )}

        <MaterialSelect
          entityId={entity.id}
          slot="sideMaterialId"
          label="Side material"
          value={slots?.sideMaterialId ?? MATERIAL_PAPER_ID}
          materials={materials}
        />

        {SIDE_FACE_IDS.map((faceId) => (
          <ColorPicker
            key={faceId}
            label={`${faceLabel(faceId)} tint`}
            value={getTint(faceId)}
            onChange={(next) => { setFaceTint(entity.id, faceId, next); }}
          />
        ))}
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
          value={printParams.cornerRadiusMm}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(value) => {
            setKindParams('print', entity.id, { cornerRadiusMm: value });
          }}
        />
        <PanelAxisField
          label="Depth"
          unit="m"
          value={depth}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) {setAssetDepth(entity.id, value);}
          }}
        />
      </SubPanelSection>
    </>
  );
}
