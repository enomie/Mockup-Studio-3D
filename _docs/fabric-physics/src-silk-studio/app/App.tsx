import { StudioPanel } from '../ui/StudioPanel.tsx';
import { Viewport } from '../ui/Viewport.tsx';

export function App(): React.ReactElement {
  return (
    <div className="flex h-full w-full select-none bg-base-200 text-base-content">
      <main className="relative min-h-0 min-w-0 flex-1 h-full">
        <Viewport />
      </main>
      <aside className="h-full w-[400px] shrink-0 overflow-y-auto bg-base-200">
        <StudioPanel />
      </aside>
    </div>
  );
}
