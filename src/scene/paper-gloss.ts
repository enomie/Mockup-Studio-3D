import { MATERIAL_PAPER_ID } from './material-ids';
import type {
  AssetMaterialSlots,
  MaterialEntitySlot,
  MaterialPreset,
} from './material-types';

/** Finish slider range: 0 = matt paper, 1 = glossy coated print. */
export const PAPER_GLOSS_MATT = 0;
export const PAPER_GLOSS_GLOSSY = 1;

/** Glossy end point of the Paper material (matt end point = the preset itself). */
const GLOSSY_ROUGHNESS = 0.15;
const GLOSSY_CLEARCOAT = 0.35;
const GLOSSY_CLEARCOAT_ROUGHNESS = 0.12;
const GLOSSY_NORMAL_SCALE = 0.15;

export function clampGloss(gloss: number): number {
  if (!Number.isFinite(gloss)) {return PAPER_GLOSS_MATT;}
  return Math.min(PAPER_GLOSS_GLOSSY, Math.max(PAPER_GLOSS_MATT, gloss));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function isPaperMaterialId(materialId: string | undefined): boolean {
  return materialId === MATERIAL_PAPER_ID;
}

/**
 * Paper preset with the finish slider applied. Interpolates roughness, clearcoat
 * and paper-grain strength between the matt preset and the glossy end point.
 * Non-Paper presets and `gloss === undefined` are returned unchanged.
 */
export function applyPaperGloss(
  preset: MaterialPreset,
  gloss: number | undefined,
): MaterialPreset {
  if (gloss === undefined || !isPaperMaterialId(preset.id)) {return preset;}
  const t = clampGloss(gloss);
  if (t === PAPER_GLOSS_MATT) {return preset;}

  const clearcoat = lerp(preset.clearcoat ?? 0, GLOSSY_CLEARCOAT, t);
  return {
    ...preset,
    roughness: lerp(preset.roughness ?? 1, GLOSSY_ROUGHNESS, t),
    clearcoat,
    clearcoatRoughness: lerp(
      preset.clearcoatRoughness ?? GLOSSY_CLEARCOAT_ROUGHNESS,
      GLOSSY_CLEARCOAT_ROUGHNESS,
      t,
    ),
    normalScale: lerp(preset.normalScale ?? 1, GLOSSY_NORMAL_SCALE, t),
  };
}

/**
 * Finish of a material slot. Stored gloss wins; an explicitly assigned Paper without
 * stored gloss is matt (former Print Matt); an empty front/back slot falls back to
 * glossy Paper (former Print Glossy default).
 */
export function resolveSlotGloss(
  materials: AssetMaterialSlots | undefined,
  slot: MaterialEntitySlot,
): number {
  const stored = materials?.slotGloss?.[slot];
  if (stored !== undefined) {return clampGloss(stored);}
  const isFaceSlot = slot === 'frontMaterialId' || slot === 'backMaterialId';
  return isFaceSlot && materials?.[slot] === undefined
    ? PAPER_GLOSS_GLOSSY
    : PAPER_GLOSS_MATT;
}
