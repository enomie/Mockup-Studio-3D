import {
  defaultWallParams,
  defaultWallpaperPattern,
  resolveWallpaperPattern,
  wallpaperStripHeightM,
} from '@/scene/asset-wall';
import { resolveEntityImagePixels } from '@/scene/asset-ui-helpers';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
import { formatLengthMeters, LENGTH_DECIMALS, parseLengthMetersInput } from '@/units/length';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { ImageSurfaceFields } from '@/ui/panels/ImageSurfaceFields';
import { setAssetScreenImage, setWallParams, setWallpaperPattern } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { MaterialSelect } from '@/ui/panels/MaterialSelect';
import type { WallFieldsProps } from './entity-fields-types';

export function WallFields({ entity, images, screenImageFieldId }: WallFieldsProps) {
  const materials = useAppStore((s) => s.materials);
  const slots = entity.materials;
  const wallParams = {
    ...defaultWallParams(),
    ...entity.wallParams,
  };
  const imagePixels = resolveEntityImagePixels(entity, images);
  const wallpaperPattern = resolveWallpaperPattern(
    {
      ...defaultWallpaperPattern(),
      ...entity.wallpaperPattern,
    },
    imagePixels.width,
    imagePixels.height,
  );
  const hasWallpaperImage =
    Boolean(entity.screenImageId) &&
    imagePixels.width !== undefined &&
    imagePixels.height !== undefined;

  return (
    <>
      <SubPanelSection title="Dimensions">
        <PanelAxisField
          label="Width"
          unit="m"
          value={wallParams.widthM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) setWallParams(entity.id, { widthM: value });
          }}
        />
        <PanelAxisField
          label="Height"
          unit="m"
          value={wallParams.heightM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) setWallParams(entity.id, { heightM: value });
          }}
        />
        <PanelAxisField
          label="Thickness"
          unit="m"
          value={wallParams.thicknessM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) setWallParams(entity.id, { thicknessM: value });
          }}
        />
      </SubPanelSection>

      <SubPanelSection title="Material">
        <MaterialSelect
          entityId={entity.id}
          slot="wallMaterialId"
          label="Wall material"
          value={slots?.wallMaterialId ?? MATERIAL_PAPER_ID}
          materials={materials}
        />
      </SubPanelSection>

      <SubPanelSection title="Wallpaper / Image">
        <ImageSurfaceFields
          entityId={entity.id}
          faceId="front"
          imageId={entity.screenImageId}
          images={images}
          imageLabel="Image"
          imageFieldId={screenImageFieldId}
          onImageChange={(imageId) => setAssetScreenImage(entity.id, imageId)}
        />
        <PanelAxisField
          label="Strip width"
          unit="m"
          value={wallpaperPattern.stripWidthM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value <= 0) return;
            const patch: { stripWidthM: number; stripHeightM?: number } = {
              stripWidthM: value,
            };
            if (hasWallpaperImage) {
              patch.stripHeightM = wallpaperStripHeightM(
                value,
                imagePixels.width,
                imagePixels.height,
              );
            }
            setWallpaperPattern(entity.id, patch);
          }}
        />
        <PanelAxisField
          label={hasWallpaperImage ? 'Strip height (from image)' : 'Strip height'}
          unit="m"
          disabled={hasWallpaperImage}
          value={wallpaperPattern.stripHeightM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value > 0) setWallpaperPattern(entity.id, { stripHeightM: value });
          }}
        />
        <PanelAxisField
          label="Column offset"
          unit="m"
          value={wallpaperPattern.columnOffsetM}
          format={(value) => formatLengthMeters(value, LENGTH_DECIMALS)}
          parse={parseLengthMetersInput}
          onChange={(value) => {
            if (value >= 0) setWallpaperPattern(entity.id, { columnOffsetM: value });
          }}
        />
        <p className="panel-hint">
          Offset for odd wallpaper columns; 0 = no half-drop.
        </p>
        {entity.assetKind === 'wall-door' ? (
          <p className="panel-hint">
            Door opening: 2.0 × 2.5 m, 1.0 m from left edge (fixed).
          </p>
        ) : null}
      </SubPanelSection>
    </>
  );
}
