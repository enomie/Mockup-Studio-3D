import { Copy, Plus, Shuffle, Trash2 } from 'lucide-react';
import {
  resolveMaterialSpec,
  SEED_MAX,
  type MaterialSpec,
  type RangeSpec,
} from '@/materials/material-spec';
import type { MaterialPreset } from '@/scene/entity-types';
import type { GridPaperUnit } from '@/scene/material-types';
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

const GRID_UNIT_OPTIONS: { value: GridPaperUnit; label: string }[] = [
  { value: 'mm', label: 'Millimeter (1 mm)' },
  { value: 'cm', label: 'Centimeter (1 cm)' },
  { value: 'dm', label: 'Decimeter (1 dm)' },
  { value: 'm', label: 'Meter (1 m)' },
];

function kindLabel(preset: MaterialPreset): string {
  if (preset.kind === 'analysis') {
    return preset.analysisMode === 'wireframe' ? 'Wireframe' : 'Zebra analysis';
  }
  if (preset.kind === 'solid-pbr') {return 'PBR';}
  return resolveMaterialSpec(preset).label;
}

function randomProceduralSeed(): number {
  return Math.floor(Math.random() * (SEED_MAX + 1));
}

type NumericField =
  | 'roughness'
  | 'metalness'
  | 'clearcoat'
  | 'clearcoatRoughness'
  | 'normalScale'
  | 'tileScale'
  | 'anisotropy'
  | 'anisotropyRotation'
  | 'sheen'
  | 'sheenRoughness'
  | 'ior'
  | 'surfaceNormalScale';

interface SpecSliderProps {
  preset: MaterialPreset;
  field: NumericField;
  label: string;
  range: RangeSpec;
}

/** Slider bound to a numeric preset field; range and fallback come from the material spec. */
function SpecSlider({ preset, field, label, range }: SpecSliderProps) {
  return (
    <RangeSlider
      label={label}
      min={range.min}
      max={range.max}
      step={range.step}
      value={preset[field] ?? range.default}
      onChange={(value) => { updateMaterial(preset.id, { [field]: value }); }}
      valueInputLabel={label}
      valueInputDecimals={range.decimals}
    />
  );
}

function SeedControls({ preset }: { preset: MaterialPreset }) {
  return (
    <>
      <RangeSlider
        label="Seed"
        min={0}
        max={SEED_MAX}
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
    </>
  );
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

function ColorSection({ preset, spec }: { preset: MaterialPreset; spec: MaterialSpec }) {
  return (
    <SubPanelSection title="Color">
      <ColorPicker
        label={spec.colorLabel}
        value={preset[spec.colorField] ?? spec.defaultColor}
        onChange={(color) => { updateMaterial(preset.id, { [spec.colorField]: color }); }}
      />
      {spec.lineColor ? (
        <ColorPicker
          label="Line color"
          value={preset.lineColor ?? spec.lineColor.default}
          onChange={(lineColor) => { updateMaterial(preset.id, { lineColor }); }}
        />
      ) : null}
    </SubPanelSection>
  );
}

function FinishSection({ preset, spec }: { preset: MaterialPreset; spec: MaterialSpec }) {
  return (
    <SubPanelSection title="Finish">
      <SpecSlider preset={preset} field="roughness" label="Roughness" range={spec.roughness} />
      {spec.metalness ? (
        <SpecSlider preset={preset} field="metalness" label="Metalness" range={spec.metalness} />
      ) : null}
      {spec.clearcoat ? (
        <>
          <SpecSlider
            preset={preset}
            field="clearcoat"
            label="Clearcoat"
            range={spec.clearcoat.amount}
          />
          <SpecSlider
            preset={preset}
            field="clearcoatRoughness"
            label="Clearcoat roughness"
            range={spec.clearcoat.roughness}
          />
        </>
      ) : null}
    </SubPanelSection>
  );
}

function PatternSection({ preset, spec }: { preset: MaterialPreset; spec: MaterialSpec }) {
  const showTileSlider = spec.tileScale && !spec.gridUnit;
  if (!spec.gridUnit && !showTileSlider && !spec.seed) {return null;}
  return (
    <SubPanelSection title="Pattern">
      {spec.gridUnit ? (
        <PanelSelect
          label="Grid unit"
          id="material-grid-unit"
          value={preset.gridUnit ?? 'mm'}
          options={GRID_UNIT_OPTIONS}
          onChange={(gridUnit) => { updateMaterial(preset.id, { gridUnit: gridUnit as GridPaperUnit }); }
          }
        />
      ) : null}
      {showTileSlider && spec.tileScale ? (
        <SpecSlider preset={preset} field="tileScale" label="Tile scale" range={spec.tileScale} />
      ) : null}
      {spec.seed ? <SeedControls preset={preset} /> : null}
    </SubPanelSection>
  );
}

function MaterialEditor({ preset }: MaterialEditorProps) {
  const isBuiltin = preset.source === 'builtin';

  if (preset.kind === 'analysis') {
    return <AnalysisMaterialEditor preset={preset} />;
  }

  const spec = resolveMaterialSpec(preset);
  const glass = spec.glass;

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
          <span className="panel-field-controls panel-field-value">{spec.label}</span>
        </div>
      </SubPanelSection>

      <ColorSection preset={preset} spec={spec} />
      <FinishSection preset={preset} spec={spec} />

      {spec.normalScale && !glass ? (
        <SubPanelSection title="Relief">
          <SpecSlider
            preset={preset}
            field="normalScale"
            label="Normal scale"
            range={spec.normalScale}
          />
        </SubPanelSection>
      ) : null}

      {!glass ? <PatternSection preset={preset} spec={spec} /> : null}

      {spec.anisotropy ? (
        <SubPanelSection title="Anisotropy">
          <SpecSlider
            preset={preset}
            field="anisotropy"
            label="Anisotropy"
            range={spec.anisotropy.amount}
          />
          <SpecSlider
            preset={preset}
            field="anisotropyRotation"
            label="Rotation"
            range={spec.anisotropy.rotation}
          />
        </SubPanelSection>
      ) : null}

      {spec.sheen ? (
        <SubPanelSection title="Sheen">
          <SpecSlider preset={preset} field="sheen" label="Sheen" range={spec.sheen.amount} />
          <SpecSlider
            preset={preset}
            field="sheenRoughness"
            label="Sheen roughness"
            range={spec.sheen.roughness}
          />
        </SubPanelSection>
      ) : null}

      {glass ? (
        <>
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
                updateMaterial(preset.id, { glassVariant: next as 'pane' | 'solid' });
              }}
            />
            <SpecSlider preset={preset} field="ior" label="IOR" range={glass.ior} />
          </SubPanelSection>
          <SubPanelSection title="Surface">
            <SpecSlider
              preset={preset}
              field="surfaceNormalScale"
              label="Surface normal scale"
              range={glass.surfaceNormalScale}
            />
            <SpecSlider
              preset={preset}
              field="tileScale"
              label="Surface tile scale"
              range={glass.surfaceTileScale}
            />
            <SeedControls preset={preset} />
          </SubPanelSection>
        </>
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
