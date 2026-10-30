import type { ImageAsset } from '@/data/image-assets';
import {
  imageSurfaceSupportsPassepartout,
  resolveImageSurfaceSettings,
  type AssetImageSurfaceId,
  type ImageSurfaceFinish,
} from '@/scene/image-surface';
import {
  formatLengthMeters,
  LENGTH_DECIMALS,
  parseLengthMetersInput,
} from '@/units/length';
import {
  NORMALIZED_DECIMALS,
  NORMALIZED_STEP,
} from '@/units/normalized';
import {
  isRotationalPrintAssetKind,
  resolveRotationalPrintSettings,
} from '@/scene/rotational-print';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { RangeSlider } from '@/ui/components/RangeSlider';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { sortByDisplayName } from '@/ui/utils/library-list-order';
import { setImageSurface } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

interface ImageSurfaceFieldsProps {
  entityId: string;
  faceId: AssetImageSurfaceId;
  imageId: string | null;
  images: ImageAsset[];
  imageLabel?: string;
  imageFieldId?: string;
  onImageChange?: (imageId: string | null) => void;
  showImagePicker?: boolean;
}

export function ImageSelect({
  id,
  label,
  value,
  images,
  onChange,
}: {
  id?: string;
  label: string;
  value: string | null;
  images: ImageAsset[];
  onChange: (imageId: string | null) => void;
}) {
  const fieldId = id ?? `image-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <PanelSelect
      label={label}
      id={fieldId}
      value={value ?? ''}
      placeholder="—"
      options={sortByDisplayName(images, (image) => image.name).map((image) => ({
        value: image.id,
        label: image.name,
      }))}
      onChange={(next) => { onChange(next === '' ? null : next); }}
    />
  );
}

function ImageFinishSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: ImageSurfaceFinish;
  onChange: (finish: ImageSurfaceFinish) => void;
}) {
  return (
    <PanelSelect
      label={label}
      id={id}
      value={value}
      options={[
        { value: 'matt', label: 'Matt' },
        { value: 'glossy', label: 'Glossy' },
      ]}
      onChange={(next) => { onChange(next as ImageSurfaceFinish); }}
    />
  );
}

export function ImageSurfaceFields({
  entityId,
  faceId,
  imageId,
  images,
  imageLabel = 'Image',
  imageFieldId,
  onImageChange,
  showImagePicker = true,
}: ImageSurfaceFieldsProps) {
  const entity = useAppStore((state) =>
    state.entities.find((entry) => entry.id === entityId),
  );
  const assetKind = entity?.assetKind;
  const surface = resolveImageSurfaceSettings(
    entity?.imageSurfaces,
    faceId,
    assetKind ? { assetKind } : undefined,
  );
  const printSettings =
    assetKind !== undefined && isRotationalPrintAssetKind(assetKind)
      ? resolveRotationalPrintSettings(surface, assetKind)
      : null;
  const showPassepartout =
    assetKind !== undefined && imageSurfaceSupportsPassepartout(assetKind);

  return (
    <>
      {showImagePicker && onImageChange ? (
        <ImageSelect
          id={imageFieldId}
          label={imageLabel}
          value={imageId}
          images={images}
          onChange={onImageChange}
        />
      ) : null}

      {printSettings ? null : (
        <ImageFinishSelect
          id={`${entityId}-${faceId}-finish`}
          label="Finish"
          value={surface.finish}
          onChange={(finish) => {
            setImageSurface(entityId, faceId, { finish });
          }}
        />
      )}

      {printSettings ? (
        <>
          <RangeSlider
            label="Finish (Matt ↔ Glossy)"
            min={0}
            max={1}
            step={NORMALIZED_STEP}
            value={printSettings.gloss}
            valueInputLabel="Gloss"
            valueInputDecimals={NORMALIZED_DECIMALS}
            onChange={(value) => {
              setImageSurface(entityId, faceId, { gloss: value });
            }}
          />
          <RangeSlider
            label="Substrate (Paper ↔ Direct)"
            min={0}
            max={1}
            step={NORMALIZED_STEP}
            value={printSettings.substrate}
            valueInputLabel="Substrate"
            valueInputDecimals={NORMALIZED_DECIMALS}
            onChange={(value) => {
              setImageSurface(entityId, faceId, { substrate: value });
            }}
          />
          <RangeSlider
            label="Ink opacity"
            min={0}
            max={1}
            step={NORMALIZED_STEP}
            value={printSettings.inkOpacity}
            valueInputLabel="Ink opacity"
            valueInputDecimals={NORMALIZED_DECIMALS}
            onChange={(value) => {
              setImageSurface(entityId, faceId, { inkOpacity: value });
            }}
          />
        </>
      ) : null}

      <PanelCheckbox
        label="Emissive"
        checked={surface.emissiveEnabled}
        onChange={(checked) => {
          setImageSurface(entityId, faceId, { emissiveEnabled: checked });
        }}
      />

      <RangeSlider
        label="Emissive intensity"
        min={0}
        max={1}
        step={NORMALIZED_STEP}
        value={surface.emissiveIntensity}
        valueInputLabel="Intensity"
        valueInputDecimals={NORMALIZED_DECIMALS}
        disabled={!surface.emissiveEnabled}
        onChange={(value) => {
          setImageSurface(entityId, faceId, { emissiveIntensity: value });
        }}
      />

      {showPassepartout ? (
        <SubPanelSection title="Passepartout">
          <ColorPicker
            label="Color"
            value={surface.passepartoutColor}
            onChange={(color) => {
              setImageSurface(entityId, faceId, { passepartoutColor: color });
            }}
          />

          <PanelAxisField
            label="Offset"
            unit="m"
            value={surface.passepartoutOffsetM}
            format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
            parse={parseLengthMetersInput}
            onChange={(value) => {
              if (value >= 0) {
                setImageSurface(entityId, faceId, {
                  passepartoutOffsetM: value,
                });
              }
            }}
          />

          <ImageFinishSelect
            id={`${entityId}-${faceId}-passepartout-finish`}
            label="Finish"
            value={surface.passepartoutFinish}
            onChange={(finish) => {
              setImageSurface(entityId, faceId, { passepartoutFinish: finish });
            }}
          />
        </SubPanelSection>
      ) : null}
    </>
  );
}
