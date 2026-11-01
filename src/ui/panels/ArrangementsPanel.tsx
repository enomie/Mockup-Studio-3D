import { Copy, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import {
  arrangementAssetCount,
  type ArrangementPreset,
} from '@/scene/arrangement-types';
import { Icon } from '@/ui/components/Icon';
import { PanelTextField } from '@/ui/components/PanelTextField';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  duplicateArrangement,
  loadArrangement,
  removeArrangement,
  saveCurrentAsArrangement,
  updateArrangement,
} from '@/ui/store/app-store';
import { sortBuiltinThenUserByName } from '@/ui/utils/library-list-order';
import { useAppStore } from '@/ui/store/use-app-store';

function assetCountLabel(preset: ArrangementPreset): string {
  const count = arrangementAssetCount(preset.content);
  const assets = count === 1 ? '1 asset' : `${count} assets`;
  return preset.source === 'builtin' ? `Built-in · ${assets}` : assets;
}

interface ArrangementEditorProps {
  preset: ArrangementPreset;
}

function ArrangementEditor({ preset }: ArrangementEditorProps) {
  return (
    <SubPanelSection title="Editor">
      <PanelTextField
        id="arrangement-name"
        label="Name"
        value={preset.name}
        onChange={(name) => { updateArrangement(preset.id, { name }); }}
      />

      <div className="material-editor-actions">
        <button
          type="button"
          className="btn"
          onClick={() => duplicateArrangement(preset.id)}
        >
          <Icon icon={Copy} size={16} strokeWidth={1.75} />
          Duplicate
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => { removeArrangement(preset.id); }}
        >
          <Icon icon={Trash2} size={16} strokeWidth={1.75} />
          Remove
        </button>
      </div>
    </SubPanelSection>
  );
}

export function ArrangementsPanel() {
  const arrangements = useAppStore((s) => s.arrangements);
  const activeArrangementId = useAppStore((s) => s.activeArrangementId);
  const sortedArrangements = sortBuiltinThenUserByName(
    arrangements,
    (preset) => preset.name,
    (preset) => preset.source === 'builtin',
  );
  const activeUser = arrangements.find(
    (entry) => entry.id === activeArrangementId && entry.source === 'user',
  );

  return (
    <SubPanel
      title="Arrangements"
      side="left"
      footer={
        <button
          type="button"
          className="btn btn--add"
          aria-label="Add new arrangement"
          title="Save the current scene assets as a new arrangement"
          onClick={() => saveCurrentAsArrangement()}
        >
          <Icon icon={Plus} />
          Add new
        </button>
      }
    >
      <ul className="tile-list">
        {sortedArrangements.map((preset) => (
          <li key={preset.id}>
            <button
              type="button"
              className="tile"
              aria-current={activeArrangementId === preset.id ? 'true' : undefined}
              aria-label={preset.name}
              title={preset.description ?? preset.name}
              onClick={() => { loadArrangement(preset.id); }}
            >
              <span className="tile__thumb tile__thumb--icon">
                <Icon icon={LayoutGrid} size={16} strokeWidth={1.75} />
              </span>
              <span className="tile__meta">
                <span className="tile__name">{preset.name}</span>
                <span className="tile__detail">{assetCountLabel(preset)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {activeUser ? <ArrangementEditor preset={activeUser} /> : null}
    </SubPanel>
  );
}
