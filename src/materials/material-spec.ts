/**
 * Single source of truth for which parameters a material exposes, with slider
 * ranges and defaults. The Materials panel renders controls from this spec and
 * the engine reads its fallback values from it, so a control is only shown when
 * the shader actually uses the value.
 */
import type { Rgb } from '@/colors/rgb';
import type { MaterialPreset, ProceduralProfileId } from '@/scene/material-types';
import { NORMALIZED_DECIMALS, NORMALIZED_STEP } from '@/units/normalized';
import { normalizeProceduralProfile } from './procedural/procedural-profile';

export interface RangeSpec {
  min: number;
  max: number;
  step: number;
  decimals: number;
  default: number;
}

interface ClearcoatSpec {
  amount: RangeSpec;
  roughness: RangeSpec;
}

interface AnisotropySpec {
  amount: RangeSpec;
  rotation: RangeSpec;
}

interface GlassSpec {
  ior: RangeSpec;
  surfaceNormalScale: RangeSpec;
  surfaceTileScale: RangeSpec;
}

export interface MaterialSpec {
  /** Profile label shown in the panel and material list. */
  label: string;
  /** Albedo control: preset `color` for opaque kinds, `tint` for glass. */
  colorField: 'color' | 'tint';
  colorLabel: string;
  defaultColor: Rgb;
  /** Grid paper (opaque): separate line color. */
  lineColor?: { default: Rgb };
  /** Textured profiles that need MeshPhysicalNodeMaterial regardless of values. */
  physical: boolean;
  roughness: RangeSpec;
  metalness?: RangeSpec;
  clearcoat?: ClearcoatSpec;
  normalScale?: RangeSpec;
  tileScale?: RangeSpec;
  /** Grid paper: tile scale is derived from the grid unit (not a slider). */
  gridUnit?: boolean;
  seed?: boolean;
  anisotropy?: AnisotropySpec;
  glass?: GlassSpec;
}

export const SEED_MAX = 99_999;

const DEFAULT_OPAQUE_COLOR: Rgb = { r: 0.8, g: 0.8, b: 0.8 };
const DEFAULT_TINT: Rgb = { r: 1, g: 1, b: 1 };
const DEFAULT_GRID_LINE_COLOR: Rgb = { r: 0.72, g: 0.78, b: 0.88 };

function normalized(defaultValue: number): RangeSpec {
  return {
    min: 0,
    max: 1,
    step: NORMALIZED_STEP,
    decimals: NORMALIZED_DECIMALS,
    default: defaultValue,
  };
}

function tileRange(defaultValue: number): RangeSpec {
  return { min: 0.5, max: 24, step: 0.1, decimals: 1, default: defaultValue };
}

const NORMAL_SCALE: RangeSpec = { min: 0, max: 2, step: 0.01, decimals: 2, default: 1 };

export const DEFAULT_TILE_SCALE_WOOD = 6;
/** Repeats per meter — ~400 ≈ 2.5 mm grain period. */
export const DEFAULT_TILE_SCALE_PAPER = 400;
/** Lines per meter — 1000 = 1 mm grid pitch. */
export const DEFAULT_TILE_SCALE_GRID_PAPER = 1000;
const DEFAULT_TILE_SCALE_SURFACE = 6;
const DEFAULT_TILE_SCALE_METAL = 4;

const PAPER_TILE: RangeSpec = { min: 100, max: 800, step: 10, decimals: 0, default: DEFAULT_TILE_SCALE_PAPER };
const GRID_TILE: RangeSpec = {
  min: 500,
  max: 2000,
  step: 50,
  decimals: 0,
  default: DEFAULT_TILE_SCALE_GRID_PAPER,
};

/** Wood: subtle lacquer coat (was a hidden constant before). */
const WOOD_CLEARCOAT: ClearcoatSpec = { amount: normalized(0.08), roughness: normalized(0.35) };
const TEXTURED_CLEARCOAT: ClearcoatSpec = { amount: normalized(0), roughness: normalized(0.12) };
const SOLID_CLEARCOAT: ClearcoatSpec = { amount: normalized(0), roughness: normalized(0.1) };

const ANISOTROPY: AnisotropySpec = {
  amount: normalized(0),
  rotation: { min: 0, max: 360, step: 1, decimals: 0, default: 0 },
};

type ProfileOverrides = Omit<
  MaterialSpec,
  'colorField' | 'colorLabel' | 'defaultColor' | 'roughness' | 'metalness'
> & { roughness?: RangeSpec };

const PROFILE_SPECS: Record<ProceduralProfileId, ProfileOverrides> = {
  'wood-soft': {
    label: 'Wood soft',
    physical: true,
    clearcoat: WOOD_CLEARCOAT,
    normalScale: NORMAL_SCALE,
    tileScale: tileRange(DEFAULT_TILE_SCALE_WOOD),
    seed: true,
  },
  'wood-porous': {
    label: 'Wood porous',
    physical: true,
    clearcoat: WOOD_CLEARCOAT,
    normalScale: NORMAL_SCALE,
    tileScale: tileRange(DEFAULT_TILE_SCALE_WOOD),
    seed: true,
  },
  'paper-grain': {
    label: 'Paper grain',
    physical: false,
    clearcoat: TEXTURED_CLEARCOAT,
    normalScale: NORMAL_SCALE,
    tileScale: PAPER_TILE,
    seed: true,
  },
  'grid-paper-opaque': {
    label: 'Grid paper (opaque)',
    physical: false,
    clearcoat: TEXTURED_CLEARCOAT,
    tileScale: GRID_TILE,
    gridUnit: true,
  },
  'grid-paper-lines': {
    label: 'Grid lines (transparent)',
    physical: false,
    clearcoat: TEXTURED_CLEARCOAT,
    tileScale: GRID_TILE,
    gridUnit: true,
  },
  'concrete-stained': {
    label: 'Concrete stained',
    physical: false,
    clearcoat: TEXTURED_CLEARCOAT,
    normalScale: NORMAL_SCALE,
    tileScale: tileRange(DEFAULT_TILE_SCALE_SURFACE),
    seed: true,
  },
  'concrete-porous': {
    label: 'Concrete porous',
    physical: false,
    clearcoat: TEXTURED_CLEARCOAT,
    normalScale: NORMAL_SCALE,
    tileScale: tileRange(DEFAULT_TILE_SCALE_SURFACE),
    seed: true,
  },
  'fabric-linen': {
    label: 'Fabric Linen',
    physical: false,
    clearcoat: TEXTURED_CLEARCOAT,
    normalScale: NORMAL_SCALE,
    tileScale: tileRange(DEFAULT_TILE_SCALE_SURFACE),
    seed: true,
  },
  // Shares the brushed-metal builder until its own shader lands (plan phase 4):
  // only anisotropy has a visible effect.
  'silk-fine': {
    label: 'Fabric Silk',
    physical: true,
    clearcoat: TEXTURED_CLEARCOAT,
    anisotropy: ANISOTROPY,
  },
  'metal-polished': {
    label: 'Metal polished',
    physical: true,
    clearcoat: TEXTURED_CLEARCOAT,
    normalScale: NORMAL_SCALE,
    tileScale: tileRange(DEFAULT_TILE_SCALE_METAL),
    seed: true,
  },
  'metal-brushed': {
    label: 'Metal brushed',
    physical: true,
    clearcoat: TEXTURED_CLEARCOAT,
    anisotropy: ANISOTROPY,
  },
  'coated-gloss': {
    label: 'Coated gloss',
    physical: true,
    clearcoat: TEXTURED_CLEARCOAT,
    normalScale: NORMAL_SCALE,
    tileScale: tileRange(DEFAULT_TILE_SCALE_SURFACE),
    seed: true,
  },
  'plastic-matte': {
    label: 'Plastic matte',
    physical: false,
    clearcoat: TEXTURED_CLEARCOAT,
    normalScale: NORMAL_SCALE,
    tileScale: tileRange(DEFAULT_TILE_SCALE_SURFACE),
    seed: true,
  },
  'plastic-smooth': {
    label: 'Plastic smooth',
    physical: true,
    clearcoat: TEXTURED_CLEARCOAT,
    normalScale: NORMAL_SCALE,
    tileScale: tileRange(DEFAULT_TILE_SCALE_SURFACE),
    seed: true,
  },
  'glass-surface': {
    label: 'Glass surface',
    physical: true,
    normalScale: NORMAL_SCALE,
    tileScale: tileRange(10),
    seed: true,
  },
};

export const DEFAULT_GLASS_SURFACE_NORMAL_SCALE = 0.15;
const DEFAULT_GLASS_SURFACE_TILE_SCALE = 10;
export const DEFAULT_GLASS_IOR = 1.52;

const SOLID_PBR_SPEC: MaterialSpec = {
  label: 'Solid PBR',
  colorField: 'color',
  colorLabel: 'Color',
  defaultColor: DEFAULT_OPAQUE_COLOR,
  physical: false,
  roughness: normalized(0.5),
  metalness: normalized(0),
  clearcoat: SOLID_CLEARCOAT,
};

function transmissionSpec(preset: MaterialPreset): MaterialSpec {
  return {
    label: preset.glassVariant === 'solid' ? 'Glass solid' : 'Glass pane',
    colorField: 'tint',
    colorLabel: 'Tint',
    defaultColor: DEFAULT_TINT,
    physical: true,
    roughness: normalized(0.02),
    seed: true,
    glass: {
      ior: { min: 1, max: 2.5, step: 0.01, decimals: 2, default: DEFAULT_GLASS_IOR },
      surfaceNormalScale: {
        min: 0,
        max: 1,
        step: 0.01,
        decimals: 2,
        default: DEFAULT_GLASS_SURFACE_NORMAL_SCALE,
      },
      surfaceTileScale: tileRange(DEFAULT_GLASS_SURFACE_TILE_SCALE),
    },
  };
}

export function proceduralProfileSpec(profile: ProceduralProfileId): MaterialSpec {
  const overrides = PROFILE_SPECS[normalizeProceduralProfile(profile)];
  const isGridLines = profile === 'grid-paper-lines';
  return {
    colorField: 'color',
    colorLabel: isGridLines ? 'Line color' : 'Color',
    defaultColor: DEFAULT_OPAQUE_COLOR,
    metalness: normalized(0),
    roughness: overrides.roughness ?? normalized(0.5),
    ...(profile === 'grid-paper-opaque' ? { lineColor: { default: DEFAULT_GRID_LINE_COLOR } } : {}),
    ...overrides,
  };
}

/** Spec for any non-analysis preset. */
export function resolveMaterialSpec(preset: MaterialPreset): MaterialSpec {
  if (preset.kind === 'transmission') {return transmissionSpec(preset);}
  if (preset.kind === 'textured' && preset.proceduralProfile) {
    return proceduralProfileSpec(preset.proceduralProfile);
  }
  return SOLID_PBR_SPEC;
}

/** Default tile scale (repeats per meter) for a procedural profile. */
export function defaultTileScaleForProfile(profile: ProceduralProfileId | undefined): number {
  if (!profile) {return DEFAULT_TILE_SCALE_METAL;}
  return proceduralProfileSpec(profile).tileScale?.default ?? DEFAULT_TILE_SCALE_METAL;
}
