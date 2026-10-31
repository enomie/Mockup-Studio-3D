import type { AssetFaceId } from './asset-faces';
import type { Rgb } from '@/colors/rgb';

export type ProceduralProfileId =
  | 'wood-soft'
  | 'wood-porous'
  | 'paper-grain'
  | 'fabric-linen'
  | 'silk-fine'
  | 'concrete-stained'
  | 'concrete-porous'
  | 'metal-polished'
  | 'metal-brushed'
  | 'glass-surface'
  | 'grid-paper-opaque'
  | 'grid-paper-lines'
  | 'coated-gloss'
  | 'plastic-matte'
  | 'plastic-smooth';

export type MaterialKind = 'solid-pbr' | 'transmission' | 'textured' | 'analysis';

/** Unlit surface-inspection modes for `kind: 'analysis'` presets. */
export type AnalysisMode = 'zebra' | 'wireframe';

export type GlassVariant = 'pane' | 'solid';

export type MaterialSource = 'builtin' | 'user';

/** Minor grid cell size for grid-paper procedural profiles. */
export type GridPaperUnit = 'mm' | 'cm' | 'dm' | 'm';

/** Rapier cloth drape profile (simulation only) — see requirements-materials.md */
export type FabricDrapeProfile = 'silk' | 'linen' | 'heavy' | 'stiff';

export interface FabricDrapePreset {
  profile: FabricDrapeProfile;
}

export interface MaterialPreset {
  id: string;
  name: string;
  source: MaterialSource;
  kind: MaterialKind;
  proceduralProfile?: ProceduralProfileId;
  color?: Rgb;
  /** Grid paper (opaque): line color; paper background uses `color`. */
  lineColor?: Rgb;
  /** Grid paper only — one minor cell = 1 unit; tileScale derived in engine. */
  gridUnit?: GridPaperUnit;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  normalScale?: number;
  tileScale?: number;
  seed?: number;
  anisotropy?: number;
  anisotropyRotation?: number;
  glassVariant?: GlassVariant;
  ior?: number;
  tint?: Rgb;
  /** Transmission: procedural glass-surface micro-normal strength (default in engine). */
  surfaceNormalScale?: number;
  /** Analysis kind only: which unlit inspection shader to use. */
  analysisMode?: AnalysisMode;
  /** Zebra analysis only: stripe frequency of the reflection pattern. */
  stripeScale?: number;
  /** Fabric cloth: Rapier drape when assigned via `fabricClothMaterialId`. */
  fabricDrape?: FabricDrapePreset;
}

export interface AssetMaterialSlots {
  frameMaterialId?: string;
  backWallMaterialId?: string;
  /** Handheld outer back glass (1 mm). */
  backGlassMaterialId?: string;
  /** Handheld side buttons (volume). */
  sideButtonMaterialId?: string;
  standBaseMaterialId?: string;
  standFootMaterialId?: string;
  glazingMaterialId?: string;
  frontMaterialId?: string;
  backMaterialId?: string;
  sideMaterialId?: string;
  wallMaterialId?: string;
  blockMaterialId?: string;
  cylinderMaterialId?: string;
  sphereMaterialId?: string;
  patchMaterialId?: string;
  fabricClothMaterialId?: string;
  bookPagesMaterialId?: string;
  bookCoverMaterialId?: string;
  bookPagesTint?: Rgb;
  bookCoverTint?: Rgb;
  metalMaterialId?: string;
  glassMaterialId?: string;
  corkMaterialId?: string;
  capsuleFoilMaterialId?: string;
  capsuleDiscMaterialId?: string;
  capMaterialId?: string;
  ringMaterialId?: string;
  bodyMaterialId?: string;
  tireMaterialId?: string;
  rimMaterialId?: string;
  faceTints?: Partial<Record<AssetFaceId, Rgb>>;
}

export type MaterialEntitySlot =
  | 'frameMaterialId'
  | 'backWallMaterialId'
  | 'backGlassMaterialId'
  | 'sideButtonMaterialId'
  | 'standBaseMaterialId'
  | 'standFootMaterialId'
  | 'glazingMaterialId'
  | 'frontMaterialId'
  | 'backMaterialId'
  | 'sideMaterialId'
  | 'wallMaterialId'
  | 'blockMaterialId'
  | 'cylinderMaterialId'
  | 'sphereMaterialId'
  | 'patchMaterialId'
  | 'fabricClothMaterialId'
  | 'bookPagesMaterialId'
  | 'bookCoverMaterialId'
  | 'metalMaterialId'
  | 'glassMaterialId'
  | 'corkMaterialId'
  | 'capsuleFoilMaterialId'
  | 'capsuleDiscMaterialId'
  | 'capMaterialId'
  | 'ringMaterialId'
  | 'bodyMaterialId'
  | 'tireMaterialId'
  | 'rimMaterialId';

export type MaterialPresetResolver = (materialId: string) => MaterialPreset | null;

/** Neutral tint — multiplies preset albedo without change. */
export const TINT_NEUTRAL: Rgb = { r: 1, g: 1, b: 1 };

export function cloneAssetMaterials(slots: AssetMaterialSlots): AssetMaterialSlots {
  const faceTints = slots.faceTints
    ? Object.fromEntries(
        Object.entries(slots.faceTints).map(([faceId, tint]) => [
          faceId,
          { ...tint },
        ]),
      ) as Partial<Record<AssetFaceId, Rgb>>
    : undefined;

  return {
    ...slots,
    faceTints,
    bookPagesTint: slots.bookPagesTint ? { ...slots.bookPagesTint } : undefined,
    bookCoverTint: slots.bookCoverTint ? { ...slots.bookCoverTint } : undefined,
  };
}
