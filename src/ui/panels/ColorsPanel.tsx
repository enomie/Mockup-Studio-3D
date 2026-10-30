import { rgbToCss } from '@/colors/color-format';
import type { ColorPreset } from '@/scene/color-types';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { Icon } from '@/ui/components/Icon';
import { PanelTextField } from '@/ui/components/PanelTextField';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  addColor,
  duplicateColor,
  removeColor,
  selectColor,
  updateColor,
} from '@/ui/store/app-store';
import { sortByDisplayName } from '@/ui/utils/library-list-order';
import { useAppStore } from '@/ui/store/use-app-store';

function swatchColor(preset: ColorPreset): string {
  return rgbToCss(preset.rgb);
}

interface ColorEditorProps {
  preset: ColorPreset;
}

function ColorEditor({ preset }: ColorEditorProps) {
  const isBuiltin = preset.source === 'builtin';

  return (
    <SubPanelSection title="Editor">
      <PanelTextField
        id="color-name"
        label="Name"
        value={preset.name}
        disabled={isBuiltin}
        onChange={(name) => { updateColor(preset.id, { name }); }}
      />

      <ColorPicker
        label="Color"
        value={preset.rgb}
        onChange={(rgb) => { updateColor(preset.id, { rgb }); }}
        disabled={isBuiltin}
      />

      <div className="material-editor-actions">
        <button
          type="button"
          className="btn"
          onClick={() => duplicateColor(preset.id)}
        >
          <Icon icon={Copy} size={16} strokeWidth={1.75} />
          Duplicate
        </button>
        {preset.source === 'user' ? (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => { removeColor(preset.id); }}
          >
            <Icon icon={Trash2} size={16} strokeWidth={1.75} />
            Remove
          </button>
        ) : null}
      </div>
    </SubPanelSection>
  );
}

export function ColorsPanel() {
  const colors = useAppStore((s) => s.colors);
  const sortedColors = sortByDisplayName(colors, (color) => color.name);
  const selectedColorId = useAppStore((s) => s.selectedColorId);
  const selected = colors.find((color) => color.id === selectedColorId);

  return (
    <SubPanel
      title="Colors"
      side="left"
      footer={
        <button
          type="button"
          className="btn btn--add"
          aria-label="Add color"
          onClick={() => addColor()}
        >
          <Icon icon={Plus} />
          Add color
        </button>
      }
    >
      <ul className="tile-list">
        {sortedColors.map((color) => (
          <li key={color.id}>
            <button
              type="button"
              className="tile"
              aria-current={selectedColorId === color.id ? 'true' : undefined}
              aria-label={color.name}
              title={color.name}
              onClick={() => { selectColor(color.id); }}
            >
              <span
                className="tile__swatch"
                style={{ backgroundColor: swatchColor(color) }}
              />
              <span className="tile__meta">
                <span className="tile__name">{color.name}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected ? <ColorEditor preset={selected} /> : null}
    </SubPanel>
  );
}
