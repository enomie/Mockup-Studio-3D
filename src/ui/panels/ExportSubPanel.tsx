import {
  EXPORT_SIZE_MAX,
  isFixedExportAspect,
  isSquareExportRatio,
  type ExportAspectPreset,
} from '@/scene/export-size';
import { PanelAxisField } from '@/ui/components/PanelAxisField/PanelAxisField';
import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { PanelToggleGroup } from '@/ui/components/PanelToggleGroup';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  setExportAspectPreset,
  setExportCustomRatio,
  setExportFrameVisible,
  setExportGroundSurface,
  setExportHeight,
  setExportImageFormat,
  setExportOrientation,
  setExportWidth,
  type ExportImageFormat,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

const EXPORT_FORMAT_OPTIONS: readonly { value: ExportImageFormat; label: string }[] = [
  { value: 'png-transparent', label: 'PNG (transparent)' },
  { value: 'jpeg', label: 'JPG' },
];

const ASPECT_PRESET_OPTIONS: readonly { value: ExportAspectPreset; label: string }[] = [
  { value: 'viewport', label: 'Viewport' },
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
  { value: 'custom', label: 'Custom' },
];

const ORIENTATION_OPTIONS = [
  { key: 'landscape', label: 'Landscape' },
  { key: 'portrait', label: 'Portrait' },
] as const;

const formatPixels = (value: number): string => String(Math.round(value));
const formatRatioPart = (value: number): string => String(value);

function parsePositive(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function ExportSizeSection() {
  const exportSize = useAppStore((s) => s.exportSize);
  const viewportPixelSize = useAppStore((s) => s.viewportPixelSize);
  const fixedAspect = isFixedExportAspect(exportSize);
  const width = fixedAspect ? exportSize.width : viewportPixelSize.width;
  const height = fixedAspect ? exportSize.height : viewportPixelSize.height;
  const atLimit = fixedAspect && Math.max(width, height) >= EXPORT_SIZE_MAX;

  return (
    <SubPanelSection title="Size">
      <PanelSelect
        label="Aspect ratio"
        ariaLabel="Export aspect ratio"
        value={exportSize.aspectPreset}
        options={ASPECT_PRESET_OPTIONS}
        onChange={(next) => {
          const option = ASPECT_PRESET_OPTIONS.find((entry) => entry.value === next);
          if (option) {setExportAspectPreset(option.value);}
        }}
      />
      {exportSize.aspectPreset === 'custom' ? (
        <>
          <PanelAxisField
            label="Ratio W"
            value={exportSize.customRatio.w}
            format={formatRatioPart}
            parse={parsePositive}
            onChange={(w) => { setExportCustomRatio({ ...exportSize.customRatio, w }); }}
          />
          <PanelAxisField
            label="Ratio H"
            value={exportSize.customRatio.h}
            format={formatRatioPart}
            parse={parsePositive}
            onChange={(h) => { setExportCustomRatio({ ...exportSize.customRatio, h }); }}
          />
        </>
      ) : null}
      <PanelToggleGroup
        label="Orientation"
        options={ORIENTATION_OPTIONS}
        active={{
          landscape: exportSize.orientation === 'landscape',
          portrait: exportSize.orientation === 'portrait',
        }}
        disabled={!fixedAspect || isSquareExportRatio(exportSize)}
        onToggle={(key) => { setExportOrientation(key); }}
      />
      <PanelAxisField
        label="Width"
        value={width}
        format={formatPixels}
        parse={parsePositive}
        unit="px"
        disabled={!fixedAspect}
        onChange={setExportWidth}
      />
      <PanelAxisField
        label="Height"
        value={height}
        format={formatPixels}
        parse={parsePositive}
        unit="px"
        disabled={!fixedAspect}
        onChange={setExportHeight}
      />
      {fixedAspect ? (
        <PanelCheckbox
          label="Show frame in viewport"
          checked={exportSize.frameVisible}
          onChange={setExportFrameVisible}
        />
      ) : (
        <p className="panel-hint">Exports the viewport as shown. Pick a ratio for a fixed size.</p>
      )}
      {atLimit ? (
        <p className="panel-hint">Limited to {EXPORT_SIZE_MAX} px per side (GPU limit).</p>
      ) : null}
    </SubPanelSection>
  );
}

export function ExportSubPanel() {
  const exportImageFormat = useAppStore((s) => s.exportImageFormat);
  const exportGroundSurface = useAppStore((s) => s.exportGroundSurface);
  const ground = useAppStore((s) => s.ground);

  const isPngTransparent = exportImageFormat === 'png-transparent';
  const contactShadowsAllowed = ground.visible && ground.receiveShadow;
  const contactShadowsOnly =
    isPngTransparent && exportGroundSurface === 'contact-shadows-only';

  return (
    <SubPanel title="Export" side="right">
      <SubPanelSection title="Format">
        <PanelSelect
          label="File type"
          ariaLabel="Export file type"
          value={exportImageFormat}
          options={EXPORT_FORMAT_OPTIONS}
          onChange={(next) => {
            if (next === 'png-transparent' || next === 'jpeg') {
              setExportImageFormat(next);
            }
          }}
        />
        {isPngTransparent && !contactShadowsOnly ? (
          <p className="panel-hint">
            Sky and empty areas export transparent; scene and ground stay as in the viewport.
          </p>
        ) : null}
      </SubPanelSection>

      <ExportSizeSection />

      {isPngTransparent ? (
        <SubPanelSection title="Ground">
          <PanelCheckbox
            label="Contact shadows only"
            checked={contactShadowsOnly}
            disabled={!contactShadowsAllowed}
            onChange={(checked) => {
              setExportGroundSurface(checked ? 'contact-shadows-only' : 'viewport');
            }}
          />
          {!contactShadowsAllowed ? (
            <p className="panel-hint">
              Turn on ground visibility and receive shadows in Environment to export contact shadows.
            </p>
          ) : contactShadowsOnly ? (
            <p className="panel-hint">
              Ground surface hidden in export; contact shadows kept. Mirror is off for this capture.
            </p>
          ) : null}
        </SubPanelSection>
      ) : null}
    </SubPanel>
  );
}
