import type { AssetKind } from './asset-kind';
import {
  isBeverageCanAssetKind,
  isPenAssetKind,
  isPatchAssetKind,
  isWheelCarAssetKind,
  isWineBottleAssetKind,
} from './asset-kind-predicates';

/** Scene panel: shared Dimensions (Size + WH) + Position footer. */
export function usesPackagingDimensionsPositionFooter(kind: AssetKind): boolean {
  return (
    isBeverageCanAssetKind(kind) ||
    isWineBottleAssetKind(kind) ||
    isPenAssetKind(kind)
  );
}

/** Dimensions live in kind fields; only Position footer at entity block end. */
export function usesWheelCarPositionFooter(kind: AssetKind): boolean {
  return isWheelCarAssetKind(kind);
}

export function usesTrianglePatchPositionFooter(kind: AssetKind): boolean {
  return isPatchAssetKind(kind);
}

export function usesScenePositionFooter(kind: AssetKind): boolean {
  return (
    usesPackagingDimensionsPositionFooter(kind) ||
    usesWheelCarPositionFooter(kind) ||
    usesTrianglePatchPositionFooter(kind)
  );
}
