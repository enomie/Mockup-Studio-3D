import type { CSSProperties } from 'react';
import { rgbToCss } from '@/colors/color-format';
import type { EnvironmentPreset } from '@/scene/environment-preset-types';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';
import { PanelTextField } from '@/ui/components/PanelTextField';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { resolveBuiltinMaterialPreset } from '@/data/material-presets';
import {
  duplicateEnvironment,
  loadEnvironment,
  removeEnvironment,
  saveCurrentAsEnvironment,
  updateEnvironment,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

function environmentSwatchStyle(preset: EnvironmentPreset): CSSProperties {
  const material =
    resolveBuiltinMaterialPreset(preset.snapshot.ground.materialId) ??
    resolveBuiltinMaterialPreset('material-paper');
  const groundRgb = material?.color ?? { r: 0.8, g: 0.8, b: 0.8 };
  const ground = rgbToCss(groundRgb);
  const sky = rgbToCss(preset.snapshot.environment.skyHorizonColor);
  return {
    background: `linear-gradient(135deg, ${sky} 0%, ${sky} 45%, ${ground} 55%, ${ground} 100%)`,
  };
}

type EnvironmentEditorProps = {
  preset: EnvironmentPreset;
};

function EnvironmentEditor({ preset }: EnvironmentEditorProps) {
  return (
    <SubPanelSection title="Editor">
      <PanelTextField
        id="environment-name"
        label="Name"
        value={preset.name}
        onChange={(name) => updateEnvironment(preset.id, { name })}
      />

      <div className="material-editor-actions">
        <button
          type="button"
          className="material-action-btn"
          onClick={() => duplicateEnvironment(preset.id)}
        >
          <Icon icon={Copy} />
          Duplicate
        </button>
        <button
          type="button"
          className="material-action-btn material-action-btn--danger"
          onClick={() => removeEnvironment(preset.id)}
        >
          <Icon icon={Trash2} />
          Remove
        </button>
      </div>
    </SubPanelSection>
  );
}

export function EnvironmentsPanel() {
  const environments = useAppStore((s) => s.environments);
  const activeEnvironmentId = useAppStore((s) => s.activeEnvironmentId);
  const activeUser = environments.find(
    (entry) => entry.id === activeEnvironmentId && entry.source === 'user',
  );

  return (
    <SubPanel
      title="Environments"
      side="left"
      footer={
        <button
          type="button"
          className="image-add-btn"
          aria-label="Save as environment"
          onClick={() => saveCurrentAsEnvironment()}
        >
          <Icon icon={Plus} />
          Save as environment
        </button>
      }
    >
      <ul className="material-list">
        {environments.map((preset) => (
          <li key={preset.id}>
            <button
              type="button"
              className={`material-tile${activeEnvironmentId === preset.id ? ' material-tile--selected' : ''}`}
              aria-label={preset.name}
              title={preset.description ?? preset.name}
              onClick={() => loadEnvironment(preset.id)}
            >
              <span
                className="material-tile__swatch"
                style={environmentSwatchStyle(preset)}
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

      {activeUser ? <EnvironmentEditor preset={activeUser} /> : null}
    </SubPanel>
  );
}
