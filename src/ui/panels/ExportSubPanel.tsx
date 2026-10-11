import { PanelCheckbox } from '@/ui/components/PanelCheckbox';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  setExportGroundSurface,
  setExportHideLightFixtures,
  setExportImageFormat,
  type ExportImageFormat,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

const EXPORT_FORMAT_OPTIONS: readonly { value: ExportImageFormat; label: string }[] = [
  { value: 'png-transparent', label: 'PNG (transparent)' },
  { value: 'jpeg', label: 'JPG' },
];

export function ExportSubPanel() {
  const exportImageFormat = useAppStore((s) => s.exportImageFormat);
  const exportGroundSurface = useAppStore((s) => s.exportGroundSurface);
  const exportHideLightFixtures = useAppStore((s) => s.exportHideLightFixtures);
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

      <SubPanelSection title="Lighting">
        <PanelCheckbox
          label="Hide light fixtures"
          checked={exportHideLightFixtures}
          onChange={(checked) => {
            setExportHideLightFixtures(checked);
          }}
        />
        <p className="panel-hint">
          Softbox discs and light wireframes are hidden only in the exported image; the viewport
          stays unchanged.
        </p>
      </SubPanelSection>

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
