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
  | 'penBody'
  | 'path0'
  | 'path1'
  | 'path2'
  | 'path3'
  | 'path4'
  | 'path5'
  | 'path6'
  | 'path7'
  | 'path8'
  | 'path9';

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
  /** Extrusion: one part per profile path slot. */
  path0?: boolean;
  path1?: boolean;
  path2?: boolean;
  path3?: boolean;
  path4?: boolean;
  path5?: boolean;
  path6?: boolean;
  path7?: boolean;
  path8?: boolean;
  path9?: boolean;
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

  if (materials && 'glazingEnabled' in materials && materials.glazingEnabled === false) {
    base.glazing = false;
  }

  return base;
}
