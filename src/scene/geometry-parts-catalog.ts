import type { AssetGeometryPartDescriptor } from './geometry-parts';

function partWithMaterial(
  part: AssetGeometryPartDescriptor['part'],
  label: string,
  materialSlot: NonNullable<AssetGeometryPartDescriptor['materialSlot']>,
): AssetGeometryPartDescriptor {
  return {
    part,
    label,
    ui: 'visibility-and-material',
    materialSlot,
  };
}

function visibilityOnlyPart(
  part: AssetGeometryPartDescriptor['part'],
  label: string,
): AssetGeometryPartDescriptor {
  return { part, label, ui: 'visibility-only' };
}

export const GEOMETRY_PARTS_PICTURE: readonly AssetGeometryPartDescriptor[] = [
  partWithMaterial('frame', 'Frame', 'frameMaterialId'),
  partWithMaterial('glazing', 'Display glass', 'glazingMaterialId'),
  partWithMaterial('backWall', 'Backplate', 'backWallMaterialId'),
];

export const GEOMETRY_PARTS_HANDHELD: readonly AssetGeometryPartDescriptor[] = [
  partWithMaterial('frame', 'Frame', 'frameMaterialId'),
  partWithMaterial('glazing', 'Display glass', 'glazingMaterialId'),
  partWithMaterial('backWall', 'Base backplate', 'backWallMaterialId'),
  partWithMaterial('outerBackPlate', 'Outer backplate', 'backGlassMaterialId'),
  partWithMaterial('sideButton', 'Side button', 'sideButtonMaterialId'),
];

export const GEOMETRY_PARTS_MONITOR: readonly AssetGeometryPartDescriptor[] = [
  partWithMaterial('frame', 'Frame', 'frameMaterialId'),
  partWithMaterial('glazing', 'Display glass', 'glazingMaterialId'),
  partWithMaterial('backWall', 'Base backplate', 'backWallMaterialId'),
  partWithMaterial('outerBackPlate', 'Outer backplate', 'backGlassMaterialId'),
  partWithMaterial('sideButton', 'Side button', 'sideButtonMaterialId'),
  partWithMaterial('standBase', 'Stand base', 'standBaseMaterialId'),
  partWithMaterial('standFoot', 'Stand foot', 'standFootMaterialId'),
];

export const GEOMETRY_PARTS_BEVERAGE_CAN: readonly AssetGeometryPartDescriptor[] = [
  visibilityOnlyPart('body', 'Body (metal)'),
  visibilityOnlyPart('topRing', 'Top ring'),
  visibilityOnlyPart('label', 'Label (print)'),
];

export const GEOMETRY_PARTS_TIN_CAN: readonly AssetGeometryPartDescriptor[] = [
  visibilityOnlyPart('body', 'Body (metal)'),
  visibilityOnlyPart('label', 'Label (print)'),
];

export const GEOMETRY_PARTS_WINE_BOTTLE: readonly AssetGeometryPartDescriptor[] = [
  partWithMaterial('body', 'Glass', 'glassMaterialId'),
  visibilityOnlyPart('label', 'Label'),
  partWithMaterial('cork', 'Cork', 'corkMaterialId'),
  partWithMaterial('capsuleFoil', 'Capsule foil', 'capsuleFoilMaterialId'),
  partWithMaterial('capsuleDisc', 'Capsule disc', 'capsuleDiscMaterialId'),
];

export const GEOMETRY_PARTS_NONE: readonly AssetGeometryPartDescriptor[] = [];
