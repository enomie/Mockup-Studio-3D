import { isBookHardcoverKind, resolveBookParams } from '@/scene/asset-book';
import { defaultBlockParams } from '@/scene/asset-block';
import {
  computeFaceSize,
  resolveAssetAspectRatio,
  resolveEntityImagePixels,
} from '@/scene/asset-ui-helpers';
import { defaultWallParams } from '@/scene/asset-wall';
import { bookCoverTint, bookPagesTint } from '@/scene/book-material-tints';
import { formatMmAsMeters, mmToM, mToMm } from '@/units/length';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSelect } from '@/ui/panels/ImageSurfaceFields';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { AssetDimensionsFields } from '@/ui/panels/entity-fields/EntityDimensionsSection';
import { parseMmInput } from '@/ui/panels/entity-fields/field-input-helpers';
import {
  setKindParams,
  setAssetScreenImage,
  setBookBackCoverImageId,
  setBookMaterialTint,
  setBookSpineImageId,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import type { PictureFieldsProps } from './entity-fields-types';

export function BookFields({
  entity,
  images,
  screenImageFieldId,
}: PictureFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const bookParams = resolveBookParams(entity.assetKind, entity.bookParams);
  const hardcover = isBookHardcoverKind(entity.assetKind);

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
      <SubPanelSection title="Front cover">
        <ImageSelect
          id={screenImageFieldId}
          label="Image"
          value={entity.screenImageId}
          images={images}
          onChange={(imageId) => { setAssetScreenImage(entity.id, imageId); }}
        />
      </SubPanelSection>

      <SubPanelSection title="Back cover">
        <ImageSelect
          id={`${screenImageFieldId}-back`}
          label="Image (optional)"
          value={entity.bookBackCoverImageId ?? null}
          images={images}
          onChange={(imageId) => { setBookBackCoverImageId(entity.id, imageId); }}
        />
      </SubPanelSection>

      <SubPanelSection title="Spine">
        <ImageSelect
          id={`${screenImageFieldId}-spine`}
          label="Image (optional)"
          value={entity.bookSpineImageId ?? null}
          images={images}
          onChange={(imageId) => { setBookSpineImageId(entity.id, imageId); }}
        />
      </SubPanelSection>

      <SubPanelSection title="Pages">
        <ColorPicker
          label="Pages color"
          value={bookPagesTint(slots)}
          onChange={(color) => { setBookMaterialTint(entity.id, 'pages', color); }}
        />
        <MaterialSelect
          entityId={entity.id}
          slot="bookPagesMaterialId"
          label="Pages material"
          value={slots?.bookPagesMaterialId ?? MATERIAL_PAPER_ID}
          materials={materials}
        />
      </SubPanelSection>

      <SubPanelSection title="Cover">
        <ColorPicker
          label="Cover color"
          value={bookCoverTint(slots)}
          onChange={(color) => { setBookMaterialTint(entity.id, 'cover', color); }}
        />
        <MaterialSelect
          entityId={entity.id}
          slot="bookCoverMaterialId"
          label="Cover material"
          value={slots?.bookCoverMaterialId ?? MATERIAL_PAPER_ID}
          materials={materials}
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
          label="Pages thickness"
          unit="mm"
          value={mToMm(bookParams.pagesThicknessM)}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(mm) => {
            if (mm > 0) {setKindParams('book', entity.id, { pagesThicknessM: mmToM(mm) });}
          }}
        />
        <PanelAxisField
          label="Cover thickness"
          unit="mm"
          value={mToMm(bookParams.coverThicknessM)}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(mm) => {
            if (mm > 0) {
              setKindParams('book', entity.id, {
                coverThicknessM: mmToM(mm),
                spineThicknessM: mmToM(mm),
              });
            }
          }}
        />
        <PanelAxisField
          label="Spine thickness"
          unit="mm"
          value={mToMm(bookParams.spineThicknessM)}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(mm) => {
            if (mm > 0) {setKindParams('book', entity.id, { spineThicknessM: mmToM(mm) });}
          }}
        />
        {hardcover ? (
          <PanelAxisField
            label="Overhang"
            unit="mm"
            value={bookParams.coverOverhangMm}
            format={(value) => String(value)}
            parse={(raw) => Number.parseFloat(raw)}
            onChange={(mm) => {
              if (mm >= 0) {setKindParams('book', entity.id, { coverOverhangMm: mm });}
            }}
          />
        ) : null}
        <PanelCheckbox
          label="Hinge groove"
          checked={bookParams.hingeGrooveEnabled}
          onChange={(checked) => {
            setKindParams('book', entity.id, { hingeGrooveEnabled: checked });
          }}
        />
        <PanelAxisField
          label="Hinge offset from spine"
          unit="mm"
          value={bookParams.hingeGrooveOffsetMm}
          format={(value) => String(value)}
          parse={(raw) => Number.parseFloat(raw)}
          onChange={(mm) => {
            if (mm >= 0) {setKindParams('book', entity.id, { hingeGrooveOffsetMm: mm });}
          }}
        />
        <PanelAxisField
          label="Hinge width"
          unit="mm"
          value={bookParams.hingeGrooveWidthMm}
          format={(value) => String(value)}
          parse={(raw) => Number.parseFloat(raw)}
          onChange={(mm) => {
            if (mm > 0) {setKindParams('book', entity.id, { hingeGrooveWidthMm: mm });}
          }}
        />
        <PanelAxisField
          label="Hinge intensity"
          value={bookParams.hingeGrooveIntensity}
          format={(value) => value.toFixed(2)}
          parse={(raw) => Number.parseFloat(raw)}
          onChange={(value) => {
            if (Number.isFinite(value)) {
              setKindParams('book', entity.id, { hingeGrooveIntensity: value });
            }
          }}
        />
      </SubPanelSection>
    </>
  );
}
