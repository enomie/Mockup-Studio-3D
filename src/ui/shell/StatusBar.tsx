import { APP_DISPLAY_NAME, APP_VERSION } from '@/app-meta';
import { useAppStore } from '@/ui/store/use-app-store';
import { VIEWPORT_TOOLS } from './viewport-tools';

export function StatusBar() {
  const mode = useAppStore((s) => s.mode);
  const tool = VIEWPORT_TOOLS.find((entry) => entry.id === mode);
  const modeLabel = tool ? `${tool.label} (${tool.shortcut})` : mode;

  return (
    <footer className="status-bar" aria-label="Status">
      <span>WebGPU</span>
      <span className="status-bar__sep">·</span>
      <span>Perspective</span>
      <span className="status-bar__sep">·</span>
      <span>{modeLabel}</span>
      <span className="status-bar__sep">·</span>
      <span>FPS —</span>
      <span className="status-bar__spacer" aria-hidden="true" />
      <span>{APP_DISPLAY_NAME} v{APP_VERSION}</span>
    </footer>
  );
}
