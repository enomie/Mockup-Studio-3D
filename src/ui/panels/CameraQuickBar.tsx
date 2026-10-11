import {
  BUILTIN_CAMERA_VIEWS,
  builtinCameraViewLabel,
  CAMERA_USER_SLOTS,
  cameraSlotLabel,
} from '@/data/camera-views';
import { loadBuiltinView, loadSlot } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { CameraProjectionToggle } from './CameraProjectionToggle';

export function CameraQuickBar() {
  const camera = useAppStore((state) => state.camera);

  return (
    <div className="camera-quick-bar" role="toolbar" aria-label="Camera views">
      <CameraProjectionToggle />

      <div className="camera-quick-bar__group">
        {BUILTIN_CAMERA_VIEWS.map((view) => {
          const label = builtinCameraViewLabel(view);
          return (
            <button
              key={view.id}
              type="button"
              className="camera-quick-bar__chip"
              aria-label={label}
              title={label}
              onClick={() => loadBuiltinView(view.id)}
            >
              <span className="camera-quick-bar__chip-label">{view.label}</span>
              <span className="camera-quick-bar__chip-key">{view.shortcut}</span>
            </button>
          );
        })}
      </div>

      <div className="camera-quick-bar__separator" aria-hidden="true" />

      <div className="camera-quick-bar__group">
        {CAMERA_USER_SLOTS.map((slotDef) => {
          const slot = camera.slots[slotDef.index - 1];
          const occupied = Boolean(slot);
          const label = cameraSlotLabel(slotDef, slot?.name);
          const displayLabel = slot?.name?.trim() || slotDef.label;

          return (
            <button
              key={slotDef.index}
              type="button"
              className={`camera-quick-bar__chip${occupied ? '' : ' camera-quick-bar__chip--empty'}`}
              aria-label={label}
              title={label}
              disabled={!occupied}
              onClick={() => {
                if (occupied) loadSlot(slotDef.index);
              }}
            >
              <span className="camera-quick-bar__chip-label">{displayLabel}</span>
              <span className="camera-quick-bar__chip-key">{slotDef.shortcut}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
