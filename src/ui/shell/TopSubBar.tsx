import { DEFAULT_SCENE_NAME } from '@/config/default-scene-assets';
import { Icon } from '@/ui/components/Icon';
import { setMode } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';
import { VIEWPORT_TOOLS, viewportToolLabel } from './viewport-tools';

export function TopSubBar() {
  const mode = useAppStore((s) => s.mode);

  return (
    <div className="top-bar top-bar--sub">
      <span className="top-bar__breadcrumb">Scene › {DEFAULT_SCENE_NAME}</span>

      <div className="viewport-tools" role="toolbar" aria-label="Viewport tools">
        {VIEWPORT_TOOLS.map((tool) => {
          const active = mode === tool.id;
          const label = viewportToolLabel(tool);
          return (
            <button
              key={tool.id}
              type="button"
              className="btn"
              aria-label={label}
              aria-pressed={active}
              title={label}
              onClick={() => { setMode(tool.id); }}
            >
              <Icon icon={tool.icon} />
              <span className="btn__key" aria-hidden="true">{tool.shortcut}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
