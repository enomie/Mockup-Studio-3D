import { Clapperboard, Plus, Trash2 } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';
import { PanelTextField } from '@/ui/components/PanelTextField';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { addScene, removeScene, renameScene, switchScene } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

export function ScenesPanel() {
  const scenes = useAppStore((s) => s.scenes);
  const activeSceneId = useAppStore((s) => s.activeSceneId);
  const active = scenes.find((entry) => entry.id === activeSceneId);

  return (
    <SubPanel
      title="Scenes"
      side="left"
      footer={
        <button
          type="button"
          className="btn btn--add"
          aria-label="Add new scene"
          title="Add a copy of the current scene and open it"
          onClick={() => { void addScene(); }}
        >
          <Icon icon={Plus} />
          Add new
        </button>
      }
    >
      <ul className="tile-list">
        {scenes.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className="tile"
              aria-current={entry.id === activeSceneId ? 'true' : undefined}
              aria-label={entry.name}
              onClick={() => { void switchScene(entry.id); }}
            >
              <span className="tile__thumb tile__thumb--icon">
                <Icon icon={Clapperboard} size={16} strokeWidth={1.75} />
              </span>
              <span className="tile__meta">
                <span className="tile__name">{entry.name}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {active ? (
        <SubPanelSection title="Editor">
          <PanelTextField
            id="scene-name"
            label="Name"
            value={active.name}
            onChange={(name) => { renameScene(active.id, name); }}
          />
          <div className="material-editor-actions">
            <button
              type="button"
              className="btn btn--danger"
              disabled={scenes.length <= 1}
              onClick={() => { void removeScene(active.id); }}
            >
              <Icon icon={Trash2} size={16} strokeWidth={1.75} />
              Remove
            </button>
          </div>
        </SubPanelSection>
      ) : null}
    </SubPanel>
  );
}
