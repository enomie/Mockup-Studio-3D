import type { AssetKind } from './asset-kind';

/** Assets whose image is printed around the lathe axis into the body material. */
export type RotationalPrintAssetKind = 'beverage-can' | 'tin-can' | 'wine-bottle' | 'pen';

export interface RotationalPrintSettings {
  /** 0 = opaque paper label, 1 = direct print (multiply on the body material). */
  substrate: number;
  /** Scales the PNG alpha (0 = no ink). */
  inkOpacity: number;
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
  return { substrate: DEFAULT_SUBSTRATE[assetKind], inkOpacity: 1 };
}
