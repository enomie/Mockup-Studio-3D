/**
 * Live material updates: value-only preset edits (color, roughness, metalness,
 * clearcoat, anisotropy, sheen, IOR, tint) are written straight into the
 * materials already on screen instead of rebuilding meshes and recompiling
 * shaders. Structural edits (profile, relief, pattern, a feature switching on
 * or off) still go through a rebuild.
 *
 * Every material created from a preset is tagged with its preset id. Only
 * materials whose whole node graph is driven by the preset are registered as
 * live; the rest (image overlays, rewired nodes) are tagged but not live, so the
 * engine knows their entity must be rebuilt.
 */
import type { Material } from 'three/webgpu';
import type { MaterialPreset } from '@/scene/material-types';
import { proceduralProfileSpec } from './material-spec';
import { normalizeProceduralProfile } from './procedural/procedural-profile';

type ValueApplier = (preset: MaterialPreset) => void;

const presetIds = new WeakMap<Material, string>();
const valueAppliers = new WeakMap<Material, ValueApplier>();
const liveMaterials = new Map<string, Set<Material>>();

/** Records which preset a material was built from and how to re-apply its values. */
export function tagPresetMaterial(
  material: Material,
  presetId: string,
  applyValues?: ValueApplier,
): void {
  presetIds.set(material, presetId);
  if (applyValues) {valueAppliers.set(material, applyValues);}
}

export function materialPresetId(material: Material): string | undefined {
  return presetIds.get(material);
}

function onDispose(this: Material): void {
  unregisterLiveMaterial(this);
}

/**
 * Makes a tagged material live. `derive` maps the raw preset to the variant the
 * material was built from (e.g. Paper with a gloss value applied).
 */
export function registerLiveMaterial(
  material: Material,
  derive: (preset: MaterialPreset) => MaterialPreset = (preset) => preset,
): void {
  const presetId = presetIds.get(material);
  const apply = valueAppliers.get(material);
  if (!presetId || !apply) {return;}
  valueAppliers.set(material, (preset) => { apply(derive(preset)); });
  let set = liveMaterials.get(presetId);
  if (!set) {
    set = new Set();
    liveMaterials.set(presetId, set);
  }
  set.add(material);
  material.addEventListener('dispose', onDispose);
}

/** Keeps the preset tag but stops live updates (caller rewires the material's nodes). */
export function unregisterLiveMaterial(material: Material): void {
  const presetId = presetIds.get(material);
  if (!presetId) {return;}
  const set = liveMaterials.get(presetId);
  if (set?.delete(material) && set.size === 0) {liveMaterials.delete(presetId);}
  material.removeEventListener('dispose', onDispose);
}

export function isLiveMaterial(material: Material): boolean {
  const presetId = presetIds.get(material);
  return presetId !== undefined && (liveMaterials.get(presetId)?.has(material) ?? false);
}

/** Writes the preset's current values into every live material built from it. */
export function applyLivePreset(preset: MaterialPreset): number {
  const set = liveMaterials.get(preset.id);
  if (!set) {return 0;}
  for (const material of set) {
    valueAppliers.get(material)?.(preset);
  }
  return set.size;
}

/** Number of live materials for a preset (tests / diagnostics). */
export function liveMaterialCount(presetId: string): number {
  return liveMaterials.get(presetId)?.size ?? 0;
}

function isPositive(value: number | undefined): boolean {
  return (value ?? 0) > 0;
}

/** Mirrors the material-class choice in createTexturedMaterial / createSolidPbrMaterial. */
function usesPhysicalMaterial(preset: MaterialPreset): boolean {
  if (preset.kind === 'transmission') {return true;}
  if (preset.kind === 'textured' && preset.proceduralProfile) {
    const spec = proceduralProfileSpec(normalizeProceduralProfile(preset.proceduralProfile));
    const clearcoat = preset.clearcoat ?? spec.clearcoat?.amount.default ?? 0;
    return (
      spec.physical ||
      (preset.metalness ?? 0) >= 0.5 ||
      isPositive(preset.anisotropy) ||
      clearcoat > 0
    );
  }
  return isPositive(preset.clearcoat);
}

/** Fields whose change alters the shader graph or geometry setup. */
const STRUCTURAL_FIELDS: readonly (keyof MaterialPreset)[] = [
  'kind',
  'proceduralProfile',
  'glassVariant',
  'analysisMode',
  'stripeScale',
  'normalScale',
  'tileScale',
  'seed',
  'gridUnit',
  'surfaceNormalScale',
];

/** Feature switches: three.js compiles different shaders for 0 vs > 0. */
const FEATURE_FIELDS = ['clearcoat', 'anisotropy', 'sheen'] as const;

/** Transmission presets switch setup at this roughness (see material-resolver). */
const CLEAR_GLASS_ROUGHNESS_THRESHOLD = 0.1;

/** True when `next` can't be applied to existing materials and needs a rebuild. */
export function isStructuralPresetChange(prev: MaterialPreset, next: MaterialPreset): boolean {
  if (prev.kind === 'analysis' || next.kind === 'analysis') {
    return prev.color !== next.color || STRUCTURAL_FIELDS.some((f) => prev[f] !== next[f]);
  }
  if (STRUCTURAL_FIELDS.some((field) => prev[field] !== next[field])) {return true;}
  if (prev.fabricDrape?.profile !== next.fabricDrape?.profile) {return true;}
  if (FEATURE_FIELDS.some((field) => isPositive(prev[field]) !== isPositive(next[field]))) {
    return true;
  }
  if (usesPhysicalMaterial(prev) !== usesPhysicalMaterial(next)) {return true;}
  if (next.kind === 'transmission') {
    const wasClear = (prev.roughness ?? 0.02) < CLEAR_GLASS_ROUGHNESS_THRESHOLD;
    const isClear = (next.roughness ?? 0.02) < CLEAR_GLASS_ROUGHNESS_THRESHOLD;
    if (wasClear !== isClear) {return true;}
  }
  return false;
}

/** True when only presentation fields (name) changed — nothing to redraw. */
export function isNameOnlyPresetChange(prev: MaterialPreset, next: MaterialPreset): boolean {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]) as Set<keyof MaterialPreset>;
  for (const key of keys) {
    if (key === 'name') {continue;}
    if (prev[key] !== next[key]) {return false;}
  }
  return true;
}
