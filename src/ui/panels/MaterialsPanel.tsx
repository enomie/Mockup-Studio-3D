import { Copy, Plus, Trash2 } from 'lucide-react';
import {
  DEFAULT_TILE_SCALE_PAPER,
  DEFAULT_TILE_SCALE_WOOD,
} from '@/materials/procedural';
import type { MaterialPreset } from '@/scene/entity-types';
import type { ProceduralProfileId } from '@/scene/material-types';
import { NORMALIZED_DECIMALS, NORMALIZED_STEP } from '@/units/normalized';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { Icon } from '@/ui/components/Icon';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { PanelTextField } from '@/ui/components/PanelTextField';
import { RangeSlider } from '@/ui/components/RangeSlider';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  addMaterial,
  duplicateMaterial,
  removeMaterial,
  selectMaterial,
  updateMaterial,
} from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

function swatchColor(preset: MaterialPreset): string {
  if (preset.kind === 'transmission') {
    const roughness = preset.roughness ?? 0.02;
    const tint = preset.tint ?? { r: 1, g: 1, b: 1 };
    const isFrosted = roughness >= 0.1;
    const base = isFrosted
      ? { r: 0.85, g: 0.92, b: 0.98 }
      : { r: 0.94, g: 0.97, b: 1 };
    const r = Math.round(base.r * tint.r * 255);
    const g = Math.round(base.g * tint.g * 255);
    const b = Math.round(base.b * tint.b * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  const color = preset.color ?? { r: 0.8, g: 0.8, b: 0.8 };
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function profileLabel(profile: MaterialPreset['proceduralProfile']): string {
  switch (profile) {
    case 'paper-grain':
      return 'Paper grain';
    case 'wood-soft':
      return 'Wood soft';
    case 'wood-porous':
      return 'Wood porous';
    case 'metal-polished':
      return 'Metal polished';
    case 'metal-brushed':
      return 'Metal brushed';
    default:
      return profile ?? 'Textured';
  }
}

type TileScaleConfig = {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  decimals: number;
};

function tileScaleConfig(profile: ProceduralProfileId | undefined): TileScaleConfig {
  if (profile === 'paper-grain') {
    return {
      min: 100,
      max: 800,
      step: 10,
      defaultValue: DEFAULT_TILE_SCALE_PAPER,
      decimals: 0,
    };
  }

  return {
    min: 0.5,
    max: 24,
    step: 0.1,
    defaultValue: DEFAULT_TILE_SCALE_WOOD,
    decimals: 1,
  };
}

function kindLabel(preset: MaterialPreset): string {
  if (preset.kind === 'transmission') {
    return preset.glassVariant === 'solid' ? 'Glass solid' : 'Glass pane';
  }
  if (preset.kind === 'textured') {
    return profileLabel(preset.proceduralProfile);
  }
  return 'PBR';
}

type MaterialEditorProps = {
  preset: MaterialPreset;
};

function MaterialEditor({ preset }: MaterialEditorProps) {
  const isBuiltin = preset.source === 'builtin';
  const tileConfig = tileScaleConfig(preset.proceduralProfile);

  return (
    <SubPanelSection title="Editor">
      <PanelTextField
        id="material-name"
        label="Name"
        value={preset.name}
        disabled={isBuiltin}
        onChange={(name) => updateMaterial(preset.id, { name })}
      />

      {preset.kind === 'solid-pbr' || preset.kind === 'textured' ? (
        <>
          {preset.kind === 'textured' ? (
            <div className="panel-field-row">
              <span className="panel-field-label">Profile</span>
              <span className="panel-field-controls panel-field-value">
                {profileLabel(preset.proceduralProfile)}
              </span>
            </div>
          ) : null}
          <ColorPicker
            label="Color"
            value={preset.color ?? { r: 0.8, g: 0.8, b: 0.8 }}
            onChange={(color) => updateMaterial(preset.id, { color })}
          />
          <RangeSlider
            label="Roughness"
            min={0}
            max={1}
            step={NORMALIZED_STEP}
            value={preset.roughness ?? 0.5}
            onChange={(value) => updateMaterial(preset.id, { roughness: value })}
            valueInputLabel="Roughness"
            valueInputDecimals={NORMALIZED_DECIMALS}
          />
          <RangeSlider
            label="Metalness"
            min={0}
            max={1}
            step={NORMALIZED_STEP}
            value={preset.metalness ?? 0}
            onChange={(value) => updateMaterial(preset.id, { metalness: value })}
            valueInputLabel="Metalness"
            valueInputDecimals={NORMALIZED_DECIMALS}
          />
          {preset.kind === 'textured' && preset.proceduralProfile !== 'metal-brushed' ? (
            <>
              <RangeSlider
                label="Normal scale"
                min={0}
                max={2}
                step={0.01}
                value={preset.normalScale ?? 1}
                onChange={(value) => updateMaterial(preset.id, { normalScale: value })}
                valueInputLabel="Normal"
                valueInputDecimals={2}
              />
              <RangeSlider
                label="Tile scale"
                min={tileConfig.min}
                max={tileConfig.max}
                step={tileConfig.step}
                value={preset.tileScale ?? tileConfig.defaultValue}
                onChange={(value) => updateMaterial(preset.id, { tileScale: value })}
                valueInputLabel="Tile"
                valueInputDecimals={tileConfig.decimals}
              />
            </>
          ) : null}
        </>
      ) : (
        <>
          <PanelSelect
            label="Variant"
            id="material-glass-variant"
            value={preset.glassVariant ?? 'pane'}
            disabled={isBuiltin}
            options={[
              { value: 'pane', label: 'Pane' },
              { value: 'solid', label: 'Solid' },
            ]}
            onChange={(next) => {
              updateMaterial(preset.id, {
                glassVariant: next as 'pane' | 'solid',
              });
            }}
          />
          <RangeSlider
            label="IOR"
            min={1}
            max={2.5}
            step={0.01}
            value={preset.ior ?? 1.5}
            onChange={(value) => updateMaterial(preset.id, { ior: value })}
            valueInputLabel="IOR"
            valueInputDecimals={2}
          />
          <RangeSlider
            label="Roughness"
            min={0}
            max={1}
            step={NORMALIZED_STEP}
            value={preset.roughness ?? 0.02}
            onChange={(value) => updateMaterial(preset.id, { roughness: value })}
            valueInputLabel="Roughness"
            valueInputDecimals={NORMALIZED_DECIMALS}
          />
          <ColorPicker
            label="Tint"
            value={preset.tint ?? { r: 1, g: 1, b: 1 }}
            onChange={(tint) => updateMaterial(preset.id, { tint })}
          />
        </>
      )}

      <div className="material-editor-actions">
        <button
          type="button"
          className="material-action-btn"
          onClick={() => duplicateMaterial(preset.id)}
        >
          <Icon icon={Copy} />
          Duplicate
        </button>
        {preset.source === 'user' ? (
          <button
            type="button"
            className="material-action-btn material-action-btn--danger"
            onClick={() => removeMaterial(preset.id)}
          >
            <Icon icon={Trash2} />
            Remove
          </button>
        ) : null}
      </div>
    </SubPanelSection>
  );
}

export function MaterialsPanel() {
  const materials = useAppStore((s) => s.materials);
  const selectedMaterialId = useAppStore((s) => s.selectedMaterialId);
  const selected = materials.find((material) => material.id === selectedMaterialId);

  return (
    <SubPanel
      title="Materials"
      side="left"
      footer={
        <button
          type="button"
          className="image-add-btn"
          aria-label="Add material"
          onClick={() => addMaterial('solid-pbr')}
        >
          <Icon icon={Plus} />
          Add material
        </button>
      }
    >
      <ul className="material-list">
        {materials.map((material) => (
          <li key={material.id}>
            <button
              type="button"
              className={`material-tile${selectedMaterialId === material.id ? ' material-tile--selected' : ''}`}
              aria-label={material.name}
              title={material.name}
              onClick={() => selectMaterial(material.id)}
            >
              <span
                className="material-tile__swatch"
                style={{ backgroundColor: swatchColor(material) }}
              />
              <span className="material-tile__meta">
                <span className="material-tile__name">{material.name}</span>
                <span className="material-tile__kind">{kindLabel(material)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected ? <MaterialEditor preset={selected} /> : null}
    </SubPanel>
  );
}
