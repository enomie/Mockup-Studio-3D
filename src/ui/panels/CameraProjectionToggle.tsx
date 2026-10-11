import type { CameraProjection } from '@/scene/scene-api';
import { setCameraProjection } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

const CAMERA_PROJECTION_OPTIONS: {
  id: CameraProjection;
  label: string;
  title: string;
}[] = [
  { id: 'perspective', label: 'Persp', title: 'Perspective' },
  { id: 'orthographic', label: 'Ortho', title: 'Orthographic' },
];

type CameraProjectionToggleProps = {
  className?: string;
  chipClassName?: string;
};

export function CameraProjectionToggle({
  className = 'camera-quick-bar__group camera-quick-bar__group--projection',
  chipClassName = 'camera-quick-bar__chip',
}: CameraProjectionToggleProps) {
  const projection = useAppStore((state) => state.camera.projection);

  return (
    <div className={className} role="group" aria-label="Camera projection">
      {CAMERA_PROJECTION_OPTIONS.map((option) => {
        const active = projection === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={`${chipClassName}${active ? ' camera-quick-bar__chip--active' : ''}`}
            aria-label={option.title}
            aria-pressed={active}
            title={option.title}
            onClick={() => setCameraProjection(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
