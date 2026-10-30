import { CAMERA_FOV_MAX, CAMERA_FOV_MIN, CAMERA_ORTHO_MAX_ZOOM, CAMERA_ORTHO_MIN_ZOOM } from '@/constants';
import { CAMERA_USER_SLOTS, cameraSlotLabel } from '@/data/camera-views';
import { Camera, FolderOpen, X } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';
import { RangeSlider } from '@/ui/components/RangeSlider';
import { ToolbarIconButton } from '@/ui/components/ToolbarIconButton';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  captureSlot,
  clearSlot,
  loadSlot,
  renameSlot,
  setCameraFov,
  setCameraOrthoZoom,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { CameraProjectionToggle } from './CameraProjectionToggle';
import { CameraReadoutSection } from './CameraReadoutSection';

export function CameraSubPanel() {
  const camera = useAppStore((state) => state.camera);

  return (
    <SubPanel title="Camera" side="right">
      <SubPanelSection title="Projection">
        <CameraProjectionToggle
          className="camera-panel-projection"
          chipClassName="btn btn--block"
        />

        {camera.projection === 'perspective' ? (
          <RangeSlider
            label="FOV"
            min={CAMERA_FOV_MIN}
            max={CAMERA_FOV_MAX}
            step={1}
            value={camera.fov}
            valueInputLabel="FOV"
            valueInputDecimals={0}
            valueUnit="°"
            onChange={setCameraFov}
          />
        ) : (
          <RangeSlider
            label="Zoom"
            min={CAMERA_ORTHO_MIN_ZOOM}
            max={CAMERA_ORTHO_MAX_ZOOM}
            step={0.01}
            value={camera.orthoZoom}
            valueInputLabel="Zoom"
            valueInputDecimals={2}
            onChange={setCameraOrthoZoom}
          />
        )}
      </SubPanelSection>

      <SubPanelSection title="Saved views">
        <div className="camera-slot-list">
          {CAMERA_USER_SLOTS.map((slotDef) => {
            const slot = camera.slots[slotDef.index - 1];
            const occupied = Boolean(slot);
            const label = cameraSlotLabel(slotDef, slot?.name);
            const loadLabel = occupied ? `Load ${label}` : `${slotDef.label} — empty`;
            const clearLabel = `Clear ${label}`;
            const captureLabel = `Capture to ${slotDef.label}`;

            return (
              <div key={slotDef.index} className="camera-slot-card">
                <div className="camera-slot-card__header">
                  <span className="camera-slot-card__badge">{slotDef.shortcut}</span>
                  {occupied ? (
                    <input
                      className="camera-slot-card__name panel-field-input panel-field-input--full"
                      type="text"
                      value={slot?.name ?? ''}
                      placeholder={slotDef.label}
                      aria-label={`${slotDef.label} name`}
                      onChange={(event) => { renameSlot(slotDef.index, event.target.value); }}
                    />
                  ) : (
                    <span className="camera-slot-card__empty-label">
                      {slotDef.label} — empty
                    </span>
                  )}
                </div>

                <div className="camera-slot-card__actions">
                  <button
                    type="button"
                    className="btn camera-slot-card__action"
                    aria-label={loadLabel}
                    title={loadLabel}
                    disabled={!occupied}
                    onClick={() => { loadSlot(slotDef.index); }}
                  >
                    <Icon icon={FolderOpen} size={16} strokeWidth={1.75} />
                    <span className="camera-slot-card__action-label">Load</span>
                  </button>

                  <button
                    type="button"
                    className="btn camera-slot-card__action"
                    aria-label={captureLabel}
                    title={captureLabel}
                    onClick={() => { captureSlot(slotDef.index); }}
                  >
                    <Icon icon={Camera} size={16} strokeWidth={1.75} />
                    <span className="camera-slot-card__action-label">Capture</span>
                  </button>

                  <ToolbarIconButton
                    icon={X}
                    ariaLabel={clearLabel}
                    disabled={!occupied}
                    onClick={() => { clearSlot(slotDef.index); }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SubPanelSection>

      <CameraReadoutSection />
    </SubPanel>
  );
}
