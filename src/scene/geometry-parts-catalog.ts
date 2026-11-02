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
  { ...visibilityOnlyPart('body', 'Body (metal)'), profileSlot: 0 },
  { ...visibilityOnlyPart('topRing', 'Top ring'), profileSlot: 1 },
  visibilityOnlyPart('label', 'Label (print)'),
];

export const GEOMETRY_PARTS_TIN_CAN: readonly AssetGeometryPartDescriptor[] = [
  visibilityOnlyPart('body', 'Body (metal)'),
  visibilityOnlyPart('label', 'Label (print)'),
];

export const GEOMETRY_PARTS_PEN: readonly AssetGeometryPartDescriptor[] = [
  { ...partWithMaterial('cap', 'Cap', 'capMaterialId'), profileSlot: 0 },
  { ...partWithMaterial('ring', 'Ring', 'ringMaterialId'), profileSlot: 1 },
  { ...partWithMaterial('penBody', 'Body', 'bodyMaterialId'), profileSlot: 2 },
];

/** Labels fall back to these names; with a profile they come from its path names (slot). */
export const GEOMETRY_PARTS_WINE_BOTTLE: readonly AssetGeometryPartDescriptor[] = [
  { ...partWithMaterial('body', 'Glass', 'glassMaterialId'), profileSlot: 0 },
  { ...partWithMaterial('cork', 'Cork', 'corkMaterialId'), profileSlot: 3 },
  { ...partWithMaterial('capsuleFoil', 'Capsule foil', 'capsuleFoilMaterialId'), profileSlot: 1 },
  { ...partWithMaterial('capsuleDisc', 'Capsule disc', 'capsuleDiscMaterialId'), profileSlot: 2 },
  visibilityOnlyPart('label', 'Label'),
];

export const GEOMETRY_PARTS_NONE: readonly AssetGeometryPartDescriptor[] = [];

/** Object Extrusion: one part per profile path slot; the UI shows only slots the profile has. */
export const GEOMETRY_PARTS_EXTRUSION: readonly AssetGeometryPartDescriptor[] = Array.from(
  { length: 10 },
  (_unused, slot) => ({
    ...partWithMaterial(
      `path${slot}` as AssetGeometryPartDescriptor['part'],
      `Path ${slot + 1}`,
      `pathMaterial${slot}Id` as NonNullable<AssetGeometryPartDescriptor['materialSlot']>,
    ),
    profileSlot: slot,
  }),
);
