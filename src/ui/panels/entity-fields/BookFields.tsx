import { isBookHardcoverKind, resolveBookParams } from '@/scene/asset-book';
import { formatMmAsMeters, mmToM, mToMm } from '@/units/length';
import { bookCoverTint, bookPagesTint } from '@/scene/book-material-tints';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSelect } from '@/ui/panels/ImageSurfaceFields';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import { parseMmInput } from '@/ui/panels/entity-fields/field-input-helpers';
import {
  setAssetScreenImage,
  setBookBackCoverImageId,
  setBookMaterialTint,
  setBookParams,
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
        <PanelAxisField
          label="Thickness"
          unit="mm"
          value={mToMm(bookParams.pagesThicknessM)}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(mm) => {
            if (mm > 0) {setBookParams(entity.id, { pagesThicknessM: mmToM(mm) });}
          }}
        />
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
        <PanelAxisField
          label="Cover thickness"
          unit="mm"
          value={mToMm(bookParams.coverThicknessM)}
          format={formatMmAsMeters}
          parse={parseMmInput}
          onChange={(mm) => {
            if (mm > 0) {
              setBookParams(entity.id, {
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
            if (mm > 0) {setBookParams(entity.id, { spineThicknessM: mmToM(mm) });}
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
              if (mm >= 0) {setBookParams(entity.id, { coverOverhangMm: mm });}
            }}
          />
        ) : null}
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

      <SubPanelSection title="Hinge groove">
        <PanelCheckbox
          label="Enable"
          checked={bookParams.hingeGrooveEnabled}
          onChange={(checked) => {
            setBookParams(entity.id, { hingeGrooveEnabled: checked });
          }}
        />
        <PanelAxisField
          label="Offset from spine"
          unit="mm"
          value={bookParams.hingeGrooveOffsetMm}
          format={(value) => String(value)}
          parse={(raw) => Number.parseFloat(raw)}
          onChange={(mm) => {
            if (mm >= 0) {setBookParams(entity.id, { hingeGrooveOffsetMm: mm });}
          }}
        />
        <PanelAxisField
          label="Width"
          unit="mm"
          value={bookParams.hingeGrooveWidthMm}
          format={(value) => String(value)}
          parse={(raw) => Number.parseFloat(raw)}
          onChange={(mm) => {
            if (mm > 0) {setBookParams(entity.id, { hingeGrooveWidthMm: mm });}
          }}
        />
        <PanelAxisField
          label="Intensity"
          value={bookParams.hingeGrooveIntensity}
          format={(value) => value.toFixed(2)}
          parse={(raw) => Number.parseFloat(raw)}
          onChange={(value) => {
            if (Number.isFinite(value)) {
              setBookParams(entity.id, { hingeGrooveIntensity: value });
            }
          }}
        />
      </SubPanelSection>
    </>
  );
}
