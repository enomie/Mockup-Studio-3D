import type { Rgb } from '@/colors/rgb';
import type { AssetFaceId, AssetFaces } from './asset-faces';
import type { AssetKind } from './asset-kind';
import {
  LEGACY_MATERIAL_GLOSSY_PRINT_ID,
  MATERIAL_PAPER_ID,
} from './material-ids';
import type { AssetMaterialSlots, MaterialEntitySlot } from './material-types';
import { clampGloss, PAPER_GLOSS_GLOSSY, PAPER_GLOSS_MATT } from './paper-gloss';

/** Load migration only: finish before the gloss slider. */
type LegacyImageSurfaceFinish = 'matt' | 'glossy';

interface LegacyImageSurfaceFields {
  finish?: LegacyImageSurfaceFinish;
  passepartoutFinish?: LegacyImageSurfaceFinish;
}

export interface ImageSurfaceSettings {
  /** Image finish on Paper: 0 = matt, 1 = glossy. */
  gloss: number;
  emissiveEnabled: boolean;
  emissiveIntensity: number;
  passepartoutColor: Rgb;
  passepartoutOffsetM: number;
  /** Passepartout finish on Paper: 0 = matt, 1 = glossy. */
  passepartoutGloss: number;
  /** Rotational assets only: 0 = paper label, 1 = direct print. Unset → per-asset default. */
  substrate?: number;
  /** Rotational assets only: scales the image alpha. Unset → 1. */
  inkOpacity?: number;
}

interface ImageSurfaceMigrationInput {
  assetKind: AssetKind;
  faces?: AssetFaces;
  materials?: AssetMaterialSlots;
  imageSurfaces?: Partial<Record<AssetFaceId, ImageSurfaceSettings>>;
  screenImageId: string | null;
}

export const PASSEPARTOUT_COLOR_WHITE: Rgb = { r: 1, g: 1, b: 1 };
export const PASSEPARTOUT_COLOR_BLACK: Rgb = { r: 0, g: 0, b: 0 };

const MIN_INNER_PLANE_M = 0.001;

/** Gap between passepartout and image meshes (toward camera). Scaled by asset `sizeScale` at use site. */
export interface PassepartoutInnerBounds {
  innerW: number;
  innerH: number;
  innerRadiusM: number;
  effectiveOffsetM: number;
}

export function computePassepartoutInnerBounds(
  outerW: number,
  outerH: number,
  outerRadiusM: number,
  offsetM: number,
): PassepartoutInnerBounds {
  const effectiveOffsetM = clampPassepartoutOffsetM(offsetM, outerW, outerH);
  const innerW = Math.max(0, outerW - 2 * effectiveOffsetM);
  const innerH = Math.max(0, outerH - 2 * effectiveOffsetM);
  const innerRadiusM = Math.max(0, outerRadiusM - effectiveOffsetM);
  return {
    innerW,
    innerH,
    innerRadiusM,
    effectiveOffsetM,
  };
}

export const DEFAULT_IMAGE_SURFACE: ImageSurfaceSettings = {
  gloss: PAPER_GLOSS_GLOSSY,
  emissiveEnabled: false,
  emissiveIntensity: 0,
  passepartoutColor: PASSEPARTOUT_COLOR_WHITE,
  passepartoutOffsetM: 0,
  passepartoutGloss: PAPER_GLOSS_MATT,
};

export function imageSurfaceSupportsPassepartout(assetKind: AssetKind): boolean {
  return (
    assetKind === 'picture' ||
    assetKind === 'smartphone' ||
    assetKind === 'tablet' ||
    assetKind === 'monitor' ||
    assetKind === 'print'
  );
}

function defaultPassepartoutColor(assetKind: AssetKind): Rgb {
  if (
    assetKind === 'smartphone' ||
    assetKind === 'tablet' ||
    assetKind === 'monitor'
  ) {
    return PASSEPARTOUT_COLOR_BLACK;
  }
  return PASSEPARTOUT_COLOR_WHITE;
}

function legacyFinishToGloss(
  finish: LegacyImageSurfaceFinish | undefined,
): number | undefined {
  if (finish === 'matt') {return PAPER_GLOSS_MATT;}
  if (finish === 'glossy') {return PAPER_GLOSS_GLOSSY;}
  return undefined;
}

export function clampPassepartoutOffsetM(
  offsetM: number,
  planeW: number,
  planeH: number,
): number {
  const safe = Math.max(0, offsetM);
  if (planeW <= 0 || planeH <= 0) {return 0;}

  const maxOffsetX = (planeW - MIN_INNER_PLANE_M) * 0.5;
  const maxOffsetY = (planeH - MIN_INNER_PLANE_M) * 0.5;
  const maxOffset = Math.max(0, Math.min(maxOffsetX, maxOffsetY));
  return Math.min(safe, maxOffset);
}

export type AssetImageSurfaceId = AssetFaceId | 'label';

export interface ResolveImageSurfaceContext {
  assetKind: AssetKind;
}

export function resolveImageSurfaceSettings(
  imageSurfaces?: Partial<Record<AssetImageSurfaceId, ImageSurfaceSettings>>,
  faceId: AssetImageSurfaceId = 'front',
  context?: ResolveImageSurfaceContext,
): ImageSurfaceSettings {
  const stored = imageSurfaces?.[faceId];
  const defaultColor = context
    ? defaultPassepartoutColor(context.assetKind)
    : PASSEPARTOUT_COLOR_WHITE;

  if (!stored) {
    return {
      ...DEFAULT_IMAGE_SURFACE,
      passepartoutColor: { ...defaultColor },
    };
  }

  const { finish, passepartoutFinish, ...rest } =
    stored as Partial<ImageSurfaceSettings> & LegacyImageSurfaceFields;
  const gloss = rest.gloss ?? legacyFinishToGloss(finish) ?? DEFAULT_IMAGE_SURFACE.gloss;
  const passepartoutGloss =
    rest.passepartoutGloss ??
    legacyFinishToGloss(passepartoutFinish) ??
    DEFAULT_IMAGE_SURFACE.passepartoutGloss;

  return {
    ...DEFAULT_IMAGE_SURFACE,
    ...rest,
    gloss: clampGloss(gloss),
    passepartoutGloss: clampGloss(passepartoutGloss),
    passepartoutColor: { ...stored.passepartoutColor },
  };
}

function cloneImageSurfaces(
  imageSurfaces?: Partial<Record<AssetImageSurfaceId, ImageSurfaceSettings>>,
): Partial<Record<AssetImageSurfaceId, ImageSurfaceSettings>> | undefined {
  if (!imageSurfaces) {return undefined;}

  return Object.fromEntries(
    Object.entries(imageSurfaces).map(([faceId, settings]) => [
      faceId,
      { ...settings },
    ]),
  );
}

function glossFromMaterialSlot(
  materials: AssetMaterialSlots,
  slot: MaterialEntitySlot,
): number | null {
  const materialId = materials[slot];
  if (materialId === LEGACY_MATERIAL_GLOSSY_PRINT_ID) {return PAPER_GLOSS_GLOSSY;}
  if (materialId === MATERIAL_PAPER_ID) {
    return materials.slotGloss?.[slot] ?? PAPER_GLOSS_MATT;
  }
  return null;
}

function faceHasImage(
  entity: Pick<ImageSurfaceMigrationInput, 'assetKind' | 'faces' | 'screenImageId'>,
  faceId: AssetFaceId,
): boolean {
  if (faceId === 'front') {
    if (
      entity.assetKind === 'picture' ||
      entity.assetKind === 'smartphone' ||
      entity.assetKind === 'tablet' ||
      entity.assetKind === 'wall' ||
      entity.assetKind === 'wall-door'
    ) {
      return true;
    }
    return entity.faces?.front.mode === 'image';
  }

  if (faceId === 'back') {
    return entity.faces?.back.mode === 'image';
  }

  return false;
}

export function migrateImageSurfaces(
  entity: ImageSurfaceMigrationInput,
): Partial<Record<AssetImageSurfaceId, ImageSurfaceSettings>> | undefined {
  const migrated = cloneImageSurfaces(entity.imageSurfaces) ?? {};
  const materials = entity.materials;
  if (!materials) {
    return Object.keys(migrated).length > 0 ? migrated : undefined;
  }

  const migrateFaceFromSlot = (
    faceId: AssetFaceId,
    slot: MaterialEntitySlot,
  ) => {
    if (migrated[faceId] || !faceHasImage(entity, faceId)) {return;}
    const gloss = glossFromMaterialSlot(materials, slot);
    if (gloss === null) {return;}
    migrated[faceId] = {
      ...resolveImageSurfaceSettings(undefined, faceId, {
        assetKind: entity.assetKind,
      }),
      gloss,
    };
  };

  migrateFaceFromSlot('front', 'frontMaterialId');
  migrateFaceFromSlot('back', 'backMaterialId');

  return Object.keys(migrated).length > 0 ? migrated : undefined;
}
