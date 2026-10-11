import type { AssetFaceId } from './asset-faces';
import type { Rgb } from '@/colors/rgb';

export type ProceduralProfileId =
  | 'wood-soft'
  | 'wood-porous'
  | 'paper-grain'
  | 'fabric-linen'
  | 'silk-fine'
  | 'concrete-porous'
  | 'metal-polished'
  | 'metal-brushed'
  | 'glass-surface';

export type MaterialKind = 'solid-pbr' | 'transmission' | 'textured';

export type GlassVariant = 'pane' | 'solid';

export type MaterialSource = 'builtin' | 'user';

export type MaterialPreset = {
  id: string;
  name: string;
  source: MaterialSource;
  kind: MaterialKind;
  proceduralProfile?: ProceduralProfileId;
  color?: Rgb;
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
};

export type AssetMaterialSlots = {
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
  metalMaterialId?: string;
  glassMaterialId?: string;
  corkMaterialId?: string;
  capsuleFoilMaterialId?: string;
  capsuleDiscMaterialId?: string;
  faceTints?: Partial<Record<AssetFaceId, Rgb>>;
};

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
  | 'metalMaterialId'
  | 'glassMaterialId'
  | 'corkMaterialId'
  | 'capsuleFoilMaterialId'
  | 'capsuleDiscMaterialId';

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
  };
}
