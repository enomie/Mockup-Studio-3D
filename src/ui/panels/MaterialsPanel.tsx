import { Copy, Plus, Shuffle, Trash2 } from 'lucide-react';
import {
  DEFAULT_TILE_SCALE_GRID_PAPER,
  DEFAULT_TILE_SCALE_PAPER,
  DEFAULT_TILE_SCALE_WOOD,
} from '@/materials/procedural';
import { DEFAULT_GLASS_SURFACE_NORMAL_SCALE } from '@/materials/procedural/glass-surface';
import { isWoodProceduralProfile } from '@/materials/procedural/procedural-registry';
import type { MaterialPreset } from '@/scene/entity-types';
import type { GridPaperUnit, ProceduralProfileId } from '@/scene/material-types';
import { NORMALIZED_DECIMALS, NORMALIZED_STEP } from '@/units/normalized';
import { ColorPicker } from '@/ui/components/ColorPicker';
import { Icon } from '@/ui/components/Icon';
import { PanelSelect } from '@/ui/components/PanelSelect';
import { PanelTextField } from '@/ui/components/PanelTextField';
import { RangeSlider } from '@/ui/components/RangeSlider';
import { DEFAULT_ZEBRA_STRIPE_SCALE } from '@/materials/analysis/analysis-material';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { sortByDisplayName } from '@/ui/utils/library-list-order';
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
    case 'grid-paper-opaque':
      return 'Grid paper (opaque)';
    case 'grid-paper-lines':
      return 'Grid lines (transparent)';
    case 'concrete-stained':
      return 'Concrete stained';
    case 'concrete-porous':
      return 'Concrete porous';
    case 'fabric-linen':
      return 'Fabric Linen';
    case 'silk-fine':
      return 'Fabric Silk';
    case 'coated-gloss':
      return 'Coated gloss';
    case 'plastic-matte':
      return 'Plastic matte';
    case 'plastic-smooth':
      return 'Plastic smooth';
    default:
      return profile ?? 'Textured';
  }
}

function isGridPaperProfile(profile: ProceduralProfileId | undefined): boolean {
  return profile === 'grid-paper-opaque' || profile === 'grid-paper-lines';
}

const GRID_UNIT_OPTIONS: { value: GridPaperUnit; label: string }[] = [
  { value: 'mm', label: 'Millimeter (1 mm)' },
  { value: 'cm', label: 'Centimeter (1 cm)' },
  { value: 'dm', label: 'Decimeter (1 dm)' },
  { value: 'm', label: 'Meter (1 m)' },
];

interface TileScaleConfig {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  decimals: number;
}

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

  if (isGridPaperProfile(profile)) {
    return {
      min: 500,
      max: 2000,
      step: 50,
      defaultValue: DEFAULT_TILE_SCALE_GRID_PAPER,
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
  if (preset.kind === 'analysis') {
    return preset.analysisMode === 'wireframe' ? 'Wireframe' : 'Zebra analysis';
  }
  if (preset.kind === 'transmission') {
    return preset.glassVariant === 'solid' ? 'Glass solid' : 'Glass pane';
  }
  if (preset.kind === 'textured') {
    return profileLabel(preset.proceduralProfile);
  }
  return 'PBR';
}

const PROCEDURAL_SEED_MAX = 99_999;

function randomProceduralSeed(): number {
  return Math.floor(Math.random() * (PROCEDURAL_SEED_MAX + 1));
}

function generalProfileLabel(preset: MaterialPreset): string {
  if (preset.kind === 'textured') {
    return profileLabel(preset.proceduralProfile);
  }
  if (preset.kind === 'transmission' || preset.kind === 'analysis') {
    return kindLabel(preset);
  }
  return 'Solid PBR';
}

function showGlassSection(preset: MaterialPreset): boolean {
  return preset.kind === 'transmission';
}

function showAnisotropySection(preset: MaterialPreset): boolean {
  const profile = preset.proceduralProfile;
  return (
    preset.kind === 'textured' && (profile === 'metal-brushed' || profile === 'silk-fine')
  );
}

function showClearcoatInFinish(preset: MaterialPreset): boolean {
  const isOpaqueKind = preset.kind === 'solid-pbr' || preset.kind === 'textured';
  if (!isOpaqueKind) {return false;}
  if (
    preset.kind === 'textured' &&
    preset.proceduralProfile &&
    isWoodProceduralProfile(preset.proceduralProfile)
  ) {
    return false;
  }
  if (
    preset.proceduralProfile === 'plastic-smooth' ||
    preset.proceduralProfile === 'coated-gloss' ||
    preset.proceduralProfile === 'metal-polished'
  ) {
    return true;
  }
  return (preset.clearcoat ?? 0) > 0;
}

const ZEBRA_STRIPE_SCALE_MIN = 2;
const ZEBRA_STRIPE_SCALE_MAX = 64;

/** Unlit inspection materials: only name, wireframe color and zebra stripe scale. */
function AnalysisMaterialEditor({ preset }: { preset: MaterialPreset }) {
  const isBuiltin = preset.source === 'builtin';
  const isWireframe = preset.analysisMode === 'wireframe';
  return (
    <div className="panel-stack">
      <SubPanelSection title="General">
        <PanelTextField
          id="material-name"
          label="Name"
          value={preset.name}
          disabled={isBuiltin}
          onChange={(name) => { updateMaterial(preset.id, { name }); }}
        />
        <div className="panel-field-row">
          <span className="panel-field-label">Profile</span>
          <span className="panel-field-controls panel-field-value">
            {kindLabel(preset)}
          </span>
        </div>
      </SubPanelSection>
      {isWireframe ? (
        <SubPanelSection title="Color">
          <ColorPicker
            label="Color"
            value={preset.color ?? { r: 0.22, g: 0.74, b: 0.97 }}
            onChange={(color) => { updateMaterial(preset.id, { color }); }}
          />
        </SubPanelSection>
      ) : (
        <SubPanelSection title="Stripes">
          <RangeSlider
            label="Stripe scale"
            min={ZEBRA_STRIPE_SCALE_MIN}
            max={ZEBRA_STRIPE_SCALE_MAX}
            step={0.5}
            value={preset.stripeScale ?? DEFAULT_ZEBRA_STRIPE_SCALE}
            onChange={(value) => { updateMaterial(preset.id, { stripeScale: value }); }}
            valueInputLabel="Stripe scale"
            valueInputDecimals={1}
          />
        </SubPanelSection>
      )}
    </div>
  );
}

interface MaterialEditorProps {
  preset: MaterialPreset;
}

function MaterialEditor({ preset }: MaterialEditorProps) {
  const isBuiltin = preset.source === 'builtin';
  const tileConfig = tileScaleConfig(preset.proceduralProfile);
  const gridProfile = isGridPaperProfile(preset.proceduralProfile);
  const primaryColorLabel =
    preset.proceduralProfile === 'grid-paper-lines' ? 'Line color' : 'Color';
  const showNormalScale =
    preset.kind === 'textured' &&
    preset.proceduralProfile !== 'metal-brushed' &&
    !gridProfile;

  const showPatternSection =
    preset.kind === 'textured' && preset.proceduralProfile !== 'metal-brushed';

  const isOpaqueKind = preset.kind === 'solid-pbr' || preset.kind === 'textured';
  const showClearcoat = showClearcoatInFinish(preset);

  if (preset.kind === 'analysis') {
    return <AnalysisMaterialEditor preset={preset} />;
  }

  return (
    <div className="panel-stack">
      <SubPanelSection title="General">
        <PanelTextField
          id="material-name"
          label="Name"
          value={preset.name}
          disabled={isBuiltin}
          onChange={(name) => { updateMaterial(preset.id, { name }); }}
        />
        <div className="panel-field-row">
          <span className="panel-field-label">Profile</span>
          <span className="panel-field-controls panel-field-value">
            {generalProfileLabel(preset)}
          </span>
        </div>
      </SubPanelSection>

      <SubPanelSection title="Color">
        {isOpaqueKind ? (
          <>
            <ColorPicker
              label={primaryColorLabel}
              value={preset.color ?? { r: 0.8, g: 0.8, b: 0.8 }}
              onChange={(color) => { updateMaterial(preset.id, { color }); }}
            />
            {preset.proceduralProfile === 'grid-paper-opaque' ? (
              <ColorPicker
                label="Line color"
                value={preset.lineColor ?? { r: 0.72, g: 0.78, b: 0.88 }}
                onChange={(lineColor) => { updateMaterial(preset.id, { lineColor }); }}
              />
            ) : null}
          </>
        ) : (
          <ColorPicker
            label="Tint"
            value={preset.tint ?? { r: 1, g: 1, b: 1 }}
            onChange={(tint) => { updateMaterial(preset.id, { tint }); }}
          />
        )}
      </SubPanelSection>

      <SubPanelSection title="Finish">
        {isOpaqueKind ? (
          <>
            <RangeSlider
              label="Roughness"
              min={0}
              max={1}
              step={NORMALIZED_STEP}
              value={preset.roughness ?? 0.5}
              onChange={(value) => { updateMaterial(preset.id, { roughness: value }); }}
              valueInputLabel="Roughness"
              valueInputDecimals={NORMALIZED_DECIMALS}
            />
            <RangeSlider
              label="Metalness"
              min={0}
              max={1}
              step={NORMALIZED_STEP}
              value={preset.metalness ?? 0}
              onChange={(value) => { updateMaterial(preset.id, { metalness: value }); }}
              valueInputLabel="Metalness"
              valueInputDecimals={NORMALIZED_DECIMALS}
            />
            {showClearcoat ? (
              <>
                <RangeSlider
                  label="Clearcoat"
                  min={0}
                  max={1}
                  step={NORMALIZED_STEP}
                  value={preset.clearcoat ?? 0}
                  onChange={(value) => { updateMaterial(preset.id, { clearcoat: value }); }}
                  valueInputLabel="Clearcoat"
                  valueInputDecimals={NORMALIZED_DECIMALS}
                />
                <RangeSlider
                  label="Clearcoat roughness"
                  min={0}
                  max={1}
                  step={NORMALIZED_STEP}
                  value={preset.clearcoatRoughness ?? 0.12}
                  onChange={(value) => { updateMaterial(preset.id, { clearcoatRoughness: value }); }
                  }
                  valueInputLabel="Clearcoat roughness"
                  valueInputDecimals={NORMALIZED_DECIMALS}
                />
              </>
            ) : null}
          </>
        ) : (
          <RangeSlider
            label="Roughness"
            min={0}
            max={1}
            step={NORMALIZED_STEP}
            value={preset.roughness ?? 0.02}
            onChange={(value) => { updateMaterial(preset.id, { roughness: value }); }}
            valueInputLabel="Roughness"
            valueInputDecimals={NORMALIZED_DECIMALS}
          />
        )}
      </SubPanelSection>

      {showNormalScale ? (
        <SubPanelSection title="Relief">
          <RangeSlider
            label="Normal scale"
            min={0}
            max={2}
            step={0.01}
            value={preset.normalScale ?? 1}
            onChange={(value) => { updateMaterial(preset.id, { normalScale: value }); }}
            valueInputLabel="Normal"
            valueInputDecimals={2}
          />
        </SubPanelSection>
      ) : null}

      {showPatternSection ? (
        <SubPanelSection title="Pattern">
          {gridProfile ? (
            <PanelSelect
              label="Grid unit"
              id="material-grid-unit"
              value={preset.gridUnit ?? 'mm'}
              options={GRID_UNIT_OPTIONS}
              onChange={(gridUnit) => { updateMaterial(preset.id, { gridUnit: gridUnit as GridPaperUnit }); }
              }
            />
          ) : null}
          {!gridProfile ? (
            <RangeSlider
              label="Tile scale"
              min={tileConfig.min}
              max={tileConfig.max}
              step={tileConfig.step}
              value={preset.tileScale ?? tileConfig.defaultValue}
              onChange={(value) => { updateMaterial(preset.id, { tileScale: value }); }}
              valueInputLabel="Tile"
              valueInputDecimals={tileConfig.decimals}
            />
          ) : null}
          <RangeSlider
            label="Seed"
            min={0}
            max={PROCEDURAL_SEED_MAX}
            step={1}
            value={preset.seed ?? 0}
            onChange={(value) => { updateMaterial(preset.id, { seed: Math.round(value) }); }}
            valueInputLabel="Seed"
            valueInputDecimals={0}
          />
          <button
            type="button"
            className="btn"
            onClick={() => { updateMaterial(preset.id, { seed: randomProceduralSeed() }); }}
          >
            <Icon icon={Shuffle} size={16} strokeWidth={1.75} />
            Randomize
          </button>
        </SubPanelSection>
      ) : null}

      {showAnisotropySection(preset) ? (
        <SubPanelSection title="Anisotropy">
          <RangeSlider
            label="Anisotropy"
            min={0}
            max={1}
            step={NORMALIZED_STEP}
            value={preset.anisotropy ?? 0}
            onChange={(value) => { updateMaterial(preset.id, { anisotropy: value }); }}
            valueInputLabel="Anisotropy"
            valueInputDecimals={NORMALIZED_DECIMALS}
          />
          <RangeSlider
            label="Rotation"
            min={0}
            max={360}
            step={1}
            value={preset.anisotropyRotation ?? 0}
            onChange={(value) => { updateMaterial(preset.id, { anisotropyRotation: value }); }}
            valueInputLabel="Rotation"
            valueInputDecimals={0}
          />
        </SubPanelSection>
      ) : null}

      {showGlassSection(preset) ? (
        <SubPanelSection title="Glass">
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
            onChange={(value) => { updateMaterial(preset.id, { ior: value }); }}
            valueInputLabel="IOR"
            valueInputDecimals={2}
          />
        </SubPanelSection>
      ) : null}

      {showGlassSection(preset) ? (
        <SubPanelSection title="Surface">
          <RangeSlider
            label="Surface normal scale"
            min={0}
            max={1}
            step={0.01}
            value={preset.surfaceNormalScale ?? DEFAULT_GLASS_SURFACE_NORMAL_SCALE}
            onChange={(value) => { updateMaterial(preset.id, { surfaceNormalScale: value }); }}
            valueInputLabel="Surface normal"
            valueInputDecimals={2}
          />
        </SubPanelSection>
      ) : null}

      <div className="material-editor-actions">
        <button
          type="button"
          className="btn"
          onClick={() => duplicateMaterial(preset.id)}
        >
          <Icon icon={Copy} size={16} strokeWidth={1.75} />
          Duplicate
        </button>
        {preset.source === 'user' ? (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => { removeMaterial(preset.id); }}
          >
            <Icon icon={Trash2} size={16} strokeWidth={1.75} />
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function MaterialsPanel() {
  const materials = useAppStore((s) => s.materials);
  const sortedMaterials = sortByDisplayName(materials, (material) => material.name);
  const selectedMaterialId = useAppStore((s) => s.selectedMaterialId);

  return (
    <SubPanel
      title="Materials"
      side="left"
      width="list"
      footer={
        <button
          type="button"
          className="btn btn--add"
          aria-label="Add material"
          onClick={() => addMaterial('solid-pbr')}
        >
          <Icon icon={Plus} />
          Add material
        </button>
      }
    >
      <ul className="tile-list">
        {sortedMaterials.map((material) => {
          const isSelected = selectedMaterialId === material.id;
          return (
            <li key={material.id}>
              <button
                type="button"
                className="tile"
              aria-current={isSelected ? 'true' : undefined}
                aria-label={material.name}
                title={material.name}
                onClick={() => { selectMaterial(isSelected ? null : material.id); }}
              >
                <span
                  className="tile__swatch"
                  style={{ backgroundColor: swatchColor(material) }}
                />
                <span className="tile__meta">
                  <span className="tile__name">{material.name}</span>
                  <span className="tile__detail">{kindLabel(material)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </SubPanel>
  );
}

/** Editor for the selected material; opens next to the Materials list. */
export function MaterialDetailPanel() {
  const materials = useAppStore((s) => s.materials);
  const selectedMaterialId = useAppStore((s) => s.selectedMaterialId);
  const selected = materials.find((material) => material.id === selectedMaterialId);

  if (!selected) {
    return null;
  }

  return (
    <SubPanel title={selected.name} side="left">
      <MaterialEditor key={selected.id} preset={selected} />
    </SubPanel>
  );
}
