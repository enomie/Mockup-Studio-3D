import { APP_DISPLAY_NAME } from '@/app-meta';
import { Download, Save, Share2 } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';
import { exportViewportImage } from '@/ui/store/app-store';
import { CameraQuickBar } from '@/ui/panels/CameraQuickBar';

function handleDummyAction(_action: string): void {
  // Placeholder until save/share flows ship.
}

export function TopMainBar() {
  return (
    <header className="top-bar top-bar--main">
      <span className="top-bar__title">{APP_DISPLAY_NAME}</span>

      <CameraQuickBar />

      <div className="top-bar__actions">
        <button
          type="button"
          className="top-bar__btn top-bar__btn--icon"
          aria-label="Save"
          title="Save"
          onClick={() => { handleDummyAction('save'); }}
        >
          <Icon icon={Save} />
        </button>

        <button
          type="button"
          className="top-bar__btn top-bar__btn--icon"
          aria-label="Export"
          title="Export"
          onClick={() => {
            void exportViewportImage();
          }}
        >
          <Icon icon={Download} />
        </button>

        <button
          type="button"
          className="top-bar__btn top-bar__btn--icon"
          aria-label="Share"
          title="Share"
          onClick={() => { handleDummyAction('share'); }}
        >
          <Icon icon={Share2} />
        </button>
      </div>
    </header>
  );
}
