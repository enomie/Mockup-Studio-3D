import {
  sizeScaleFromFaceHeight,
  sizeScaleFromFaceWidth,
} from '@/scene/asset-ui-helpers';
import type { AssetEntity } from '@/scene/entity-types';
import {
  formatLengthMeters,
  LENGTH_DECIMALS,
  parseLengthMetersInput,
} from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { setAssetSizeScale } from '@/ui/store/app-store';
import { formatSizeScale, parseSizeScaleInput } from './field-input-helpers';

type AssetDimensionsFieldsMode = 'sizeScaleAndFace' | 'faceOnly';

export interface AssetDimensionsFieldsProps {
  entity: AssetEntity;
  faceSize: { width: number; height: number };
  aspect: number;
  mode?: AssetDimensionsFieldsMode;
  dimensionsReadOnly?: boolean;
  /** Overrides the default aspect-locked width edit (e.g. free width/height). */
  onWidthChange?: (widthM: number) => void;
  /** Overrides the default aspect-locked height edit. */
  onHeightChange?: (heightM: number) => void;
}

export function AssetDimensionsFields({
  entity,
  faceSize,
  aspect,
  mode = 'sizeScaleAndFace',
  dimensionsReadOnly = false,
  onWidthChange,
  onHeightChange,
}: AssetDimensionsFieldsProps) {
  return (
    <>
      {mode === 'sizeScaleAndFace' ? (
        <PanelAxisField
          label="Size"
          value={entity.sizeScale}
          format={formatSizeScale}
          parse={parseSizeScaleInput}
          onChange={(value) => { setAssetSizeScale(entity.id, value); }}
        />
      ) : null}
      <PanelAxisField
        label="Width"
        unit="m"
        value={faceSize.width}
        disabled={dimensionsReadOnly}
        format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
        parse={parseLengthMetersInput}
        onChange={(value) => {
          if (onWidthChange) {
            onWidthChange(value);
            return;
          }
          const nextScale = sizeScaleFromFaceWidth(
            entity.assetKind,
            value,
            aspect,
            entity,
          );
          if (nextScale !== null) {setAssetSizeScale(entity.id, nextScale);}
        }}
      />
      <PanelAxisField
        label="Height"
        unit="m"
        value={faceSize.height}
        disabled={dimensionsReadOnly}
        format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
        parse={parseLengthMetersInput}
        onChange={(value) => {
          if (onHeightChange) {
            onHeightChange(value);
            return;
          }
          const nextScale = sizeScaleFromFaceHeight(
            entity.assetKind,
            value,
            aspect,
            entity,
          );
          if (nextScale !== null) {setAssetSizeScale(entity.id, nextScale);}
        }}
      />
    </>
  );
}

export function EntityDimensionsSection(props: AssetDimensionsFieldsProps) {
  return (
    <SubPanelSection title="Dimensions">
      <AssetDimensionsFields {...props} />
    </SubPanelSection>
  );
}
