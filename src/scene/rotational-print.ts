import type { AssetKind } from './asset-kind';
import type { ImageSurfaceSettings } from './image-surface';

/** Assets whose image is printed around the lathe axis into the body material. */
export type RotationalPrintAssetKind = 'beverage-can' | 'tin-can' | 'wine-bottle' | 'pen';

export interface RotationalPrintSettings {
  /** 0 = opaque paper label, 1 = direct print (multiply on the body material). */
  substrate: number;
  /** Scales the PNG alpha (0 = no ink). */
  inkOpacity: number;
  /** 0 = matt print, 1 = glossy lacquer. */
  gloss: number;
}

/** Defaults per asset: printed metal can and pen shaft, paper labels on tin can and bottle. */
const DEFAULT_SUBSTRATE: Record<RotationalPrintAssetKind, number> = {
  'beverage-can': 1,
  'tin-can': 0,
  'wine-bottle': 0,
  pen: 1,
};

export function isRotationalPrintAssetKind(
  assetKind: AssetKind,
): assetKind is RotationalPrintAssetKind {
  return assetKind in DEFAULT_SUBSTRATE;
}

export function defaultRotationalPrintSettings(
  assetKind: RotationalPrintAssetKind,
): RotationalPrintSettings {
  return { substrate: DEFAULT_SUBSTRATE[assetKind], inkOpacity: 1, gloss: 1 };
}

/** Stored values from the label surface, falling back to the asset defaults. Gloss falls back to `finish`. */
export function resolveRotationalPrintSettings(
  surface: Pick<ImageSurfaceSettings, 'substrate' | 'inkOpacity' | 'gloss' | 'finish'>,
  assetKind: RotationalPrintAssetKind,
): RotationalPrintSettings {
  const defaults = defaultRotationalPrintSettings(assetKind);
  return {
    substrate: surface.substrate ?? defaults.substrate,
    inkOpacity: surface.inkOpacity ?? defaults.inkOpacity,
    gloss: surface.gloss ?? (surface.finish === 'matt' ? 0 : 1),
  };
}

/** Image surface fields that only drive print uniforms (slider changes, no rebuild). */
export const ROTATIONAL_PRINT_UNIFORM_FIELDS = ['substrate', 'inkOpacity', 'gloss'] as const;
