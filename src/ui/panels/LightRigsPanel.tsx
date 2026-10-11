import type { CSSProperties } from 'react';
import { rgbToCss } from '@/colors/color-format';
import type { LightingPreset } from '@/scene/lighting-preset-types';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';
import { PanelTextField } from '@/ui/components/PanelTextField';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  duplicateLightingPreset,
  loadLightingPreset,
  removeLightingPreset,
  saveCurrentAsLightingPreset,
  updateLightingPreset,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

function lightRigSwatchStyle(preset: LightingPreset): CSSProperties {
  const key = rgbToCss(preset.snapshot.key.color);
  const fill = rgbToCss(preset.snapshot.fill.color);
  return {
    background: `linear-gradient(135deg, ${key} 0%, ${key} 48%, ${fill} 52%, ${fill} 100%)`,
  };
}

type LightRigEditorProps = {
  preset: LightingPreset;
};

function LightRigEditor({ preset }: LightRigEditorProps) {
  return (
    <SubPanelSection title="Editor">
      <PanelTextField
        id="light-rig-name"
        label="Name"
        value={preset.name}
        onChange={(name) => updateLightingPreset(preset.id, { name })}
      />

      <div className="material-editor-actions">
        <button
          type="button"
          className="material-action-btn"
          onClick={() => duplicateLightingPreset(preset.id)}
        >
          <Icon icon={Copy} />
          Duplicate
        </button>
        <button
          type="button"
          className="material-action-btn material-action-btn--danger"
          onClick={() => removeLightingPreset(preset.id)}
        >
          <Icon icon={Trash2} />
          Remove
        </button>
      </div>
    </SubPanelSection>
  );
}

export function LightRigsPanel() {
  const lightingPresets = useAppStore((s) => s.lightingPresets);
  const activeLightingPresetId = useAppStore((s) => s.activeLightingPresetId);
  const activeUser = lightingPresets.find(
    (entry) => entry.id === activeLightingPresetId && entry.source === 'user',
  );

  return (
    <SubPanel
      title="Light rigs"
      side="left"
      footer={
        <button
          type="button"
          className="image-add-btn"
          aria-label="Save as light rig"
          onClick={() => saveCurrentAsLightingPreset()}
        >
          <Icon icon={Plus} />
          Save as light rig
        </button>
      }
    >
      <ul className="material-list">
        {lightingPresets.map((preset) => (
          <li key={preset.id}>
            <button
              type="button"
              className={`material-tile${activeLightingPresetId === preset.id ? ' material-tile--selected' : ''}`}
              aria-label={preset.name}
              title={preset.description ?? preset.name}
              onClick={() => loadLightingPreset(preset.id)}
            >
              <span
                className="material-tile__swatch"
                style={lightRigSwatchStyle(preset)}
              />
              <span className="material-tile__meta">
                <span className="material-tile__name">{preset.name}</span>
                {preset.source === 'builtin' ? (
                  <span className="material-tile__kind">Built-in</span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {activeUser ? <LightRigEditor preset={activeUser} /> : null}
    </SubPanel>
  );
}
