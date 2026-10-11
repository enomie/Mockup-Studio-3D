import { getGeometryPartsForKind } from './asset-kind-registry';
import type { AssetKind } from './asset-kind';
import type { AssetGeometryVisibility } from './geometry-visibility';
import { geometryVisibilityFromPartDescriptors } from './geometry-parts';

export function defaultGeometryVisibilityForKind(
  assetKind: AssetKind,
): AssetGeometryVisibility {
  return geometryVisibilityFromPartDescriptors(getGeometryPartsForKind(assetKind));
}
