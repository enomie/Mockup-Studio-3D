import { Cuboid, Square, type LucideIcon } from 'lucide-react';
import type { CameraProjection } from '@/scene/scene-api';
import { Icon } from '@/ui/components/Icon';
import { setCameraProjection } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

const CAMERA_PROJECTION_OPTIONS: {
  id: CameraProjection;
  label: string;
  title: string;
  icon: LucideIcon;
}[] = [
  { id: 'perspective', label: 'Persp', title: 'Perspective', icon: Cuboid },
  { id: 'orthographic', label: 'Ortho', title: 'Orthographic', icon: Square },
];

interface CameraProjectionToggleProps {
  className?: string;
  chipClassName?: string;
}

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
            className={`${chipClassName} camera-projection-chip${active ? ' toolbar-chip-btn--active' : ''}`}
            aria-label={option.title}
            aria-pressed={active}
            title={option.title}
            onClick={() => { setCameraProjection(option.id); }}
          >
            <Icon icon={option.icon} size={16} strokeWidth={1.75} />
            <span className="camera-projection-chip__label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
