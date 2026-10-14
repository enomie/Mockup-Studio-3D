import type { AssetKind } from './asset-kind';
import type { AssetMaterialSlots } from './material-types';
import { defaultGeometryVisibilityForKind } from './geometry-visibility-defaults';

export type AssetGeometryPart =
  | 'frame'
  | 'glazing'
  | 'backWall'
  | 'outerBackPlate'
  | 'sideButton'
  | 'standBase'
  | 'standFoot'
  | 'body'
  | 'topRing'
  | 'label'
  | 'cork'
  | 'capsuleFoil'
  | 'capsuleDisc'
  | 'cap'
  | 'ring'
  | 'penBody';

export interface AssetGeometryVisibility {
  frame?: boolean;
  glazing?: boolean;
  backWall?: boolean;
  outerBackPlate?: boolean;
  sideButton?: boolean;
  standBase?: boolean;
  standFoot?: boolean;
  body?: boolean;
  topRing?: boolean;
  label?: boolean;
  cork?: boolean;
  capsuleFoil?: boolean;
  capsuleDisc?: boolean;
  cap?: boolean;
  ring?: boolean;
  penBody?: boolean;
}

export function defaultGeometryVisibility(
  assetKind: AssetKind,
): AssetGeometryVisibility {
  return defaultGeometryVisibilityForKind(assetKind);
}

export function isGeometryVisible(
  visibility: AssetGeometryVisibility | undefined,
  part: AssetGeometryPart,
): boolean {
  const value = visibility?.[part];
  return value ?? true;
}

export function cloneGeometryVisibility(
  visibility: AssetGeometryVisibility,
): AssetGeometryVisibility {
  return { ...visibility };
}

/** Migrate legacy `materials.glazingEnabled` into `geometryVisibility.glazing`. */
export function migrateGeometryVisibility(
  assetKind: AssetKind,
  visibility?: AssetGeometryVisibility,
  materials?: AssetMaterialSlots,
): AssetGeometryVisibility {
  const base = {
    ...defaultGeometryVisibility(assetKind),
    ...visibility,
  };

  const legacyMaterials = materials as AssetMaterialSlots & {
    glazingEnabled?: boolean;
  };
  if (legacyMaterials.glazingEnabled === false) {
    base.glazing = false;
  }

  return base;
}
