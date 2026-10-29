import { isHandheldAssetKind } from '@/scene/asset-handheld';
import { isMonitorAssetKind } from '@/scene/asset-monitor';
import type { AssetKind } from '@/scene/entity-types';
import type { AssetMaterialSlots, MaterialPreset } from '@/scene/material-types';
import {
  MATERIAL_ALUMINUM_BRUSHED_ID,
  MATERIAL_CHROME_ID,
  MATERIAL_GLASS_FROSTED_PANE_ID,
  MATERIAL_GLASS_FROSTED_SOLID_ID,
  MATERIAL_GLASS_PANE_ID,
  MATERIAL_GLASS_SOLID_ID,
  MATERIAL_GLASS_WINE_BOTTLE_ID,
  MATERIAL_GLOSSY_PRINT_ID,
  MATERIAL_GOLD_BRUSHED_ID,
  MATERIAL_GRID_LINES_ID,
  MATERIAL_GRID_PAPER_ID,
  MATERIAL_FABRIC_ID,
  MATERIAL_GOLD_ID,
  MATERIAL_PAPER_ID,
  MATERIAL_PLASTIC_MATTE_ID,
  MATERIAL_PLASTIC_SMOOTH_ID,
  MATERIAL_CONCRETE_POROUS_ID,
  MATERIAL_WOOD_POROUS_ID,
  migrateMaterialId,
} from '@/scene/material-ids';

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: MATERIAL_PAPER_ID,
    name: 'Print Matt',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'paper-grain',
    color: { r: 0.96, g: 0.95, b: 0.92 },
    roughness: 0.92,
    metalness: 0,
    normalScale: 0.85,
    tileScale: 400,
    seed: 0,
  },
  {
    id: MATERIAL_GRID_PAPER_ID,
    name: 'Grid Paper',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'grid-paper-opaque',
    gridUnit: 'mm',
    color: { r: 0.99, g: 0.99, b: 0.97 },
    lineColor: { r: 0.72, g: 0.78, b: 0.88 },
    roughness: 0.92,
    metalness: 0,
    tileScale: 1000,
    seed: 0,
  },
  {
    id: MATERIAL_GRID_LINES_ID,
    name: 'Grid Lines',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'grid-paper-lines',
    gridUnit: 'mm',
    color: { r: 0.72, g: 0.78, b: 0.88 },
    roughness: 0.9,
    metalness: 0,
    tileScale: 1000,
    seed: 0,
  },
  {
    id: MATERIAL_GLOSSY_PRINT_ID,
    name: 'Print Glossy',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'coated-gloss',
    color: { r: 0.95, g: 0.93, b: 0.91 },
    roughness: 0.15,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.12,
    normalScale: 0.5,
    tileScale: 6,
    seed: 0,
  },
  {
    id: MATERIAL_GOLD_ID,
    name: 'Gold',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'metal-polished',
    color: { r: 1, g: 0.77, b: 0.33 },
    roughness: 0.08,
    metalness: 1,
    clearcoat: 0.35,
    clearcoatRoughness: 0.12,
    normalScale: 1,
    tileScale: 8,
    seed: 0,
  },
  {
    id: MATERIAL_CHROME_ID,
    name: 'Chrome',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'metal-polished',
    color: { r: 0.92, g: 0.93, b: 0.95 },
    roughness: 0.05,
    metalness: 1,
    clearcoat: 0.35,
    clearcoatRoughness: 0.12,
    normalScale: 1,
    tileScale: 8,
    seed: 0,
  },
  {
    id: MATERIAL_GOLD_BRUSHED_ID,
    name: 'Gold Brushed',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'metal-brushed',
    color: { r: 1, g: 0.77, b: 0.33 },
    roughness: 0.32,
    metalness: 1,
    normalScale: 0.6,
    tileScale: 28,
    seed: 0,
    anisotropy: 0.25,
  },
  {
    id: MATERIAL_ALUMINUM_BRUSHED_ID,
    name: 'Aluminum Brushed',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'metal-brushed',
    color: { r: 0.91, g: 0.92, b: 0.93 },
    roughness: 0.28,
    metalness: 1,
    normalScale: 0.6,
    tileScale: 28,
    seed: 0,
    anisotropy: 0.25,
  },
  {
    id: MATERIAL_PLASTIC_MATTE_ID,
    name: 'Plastic Matte',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'plastic-matte',
    color: { r: 0.13, g: 0.13, b: 0.14 },
    roughness: 0.72,
    metalness: 0,
    normalScale: 0.6,
    tileScale: 6,
    seed: 0,
  },
  {
    id: MATERIAL_PLASTIC_SMOOTH_ID,
    name: 'Plastic Smooth',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'plastic-smooth',
    color: { r: 0.13, g: 0.13, b: 0.14 },
    roughness: 0.18,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.12,
    normalScale: 0.4,
    tileScale: 6,
    seed: 0,
  },
  {
    id: 'material-fabric',
    name: 'Fabric Linen',
    source: 'builtin',
    kind: 'textured',
    fabricDrape: { profile: 'linen' },
    proceduralProfile: 'fabric-linen',
    color: { r: 0.75, g: 0.73, b: 0.7 },
    roughness: 0.88,
    metalness: 0,
    normalScale: 0.9,
    tileScale: 6,
    seed: 0,
  },
  {
    id: 'material-silk',
    name: 'Fabric Silk',
    source: 'builtin',
    kind: 'textured',
    fabricDrape: { profile: 'silk' },
    proceduralProfile: 'metal-brushed',
    color: { r: 0.92, g: 0.9, b: 0.88 },
    roughness: 0.32,
    metalness: 1,
    anisotropy: 0.25,
    normalScale: 0.6,
    tileScale: 28,
    seed: 0,
  },
  {
    id: 'material-wood',
    name: 'Wood Soft',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'wood-soft',
    color: { r: 0.78, g: 0.65, b: 0.45 },
    roughness: 0.42,
    metalness: 0,
    normalScale: 1,
    tileScale: 6,
    seed: 0,
  },
  {
    id: 'material-wood-porous',
    name: 'Wood Porous',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'wood-porous',
    color: { r: 0.62, g: 0.48, b: 0.32 },
    roughness: 0.48,
    metalness: 0,
    normalScale: 0.8,
    tileScale: 6,
    seed: 0,
  },
  {
    id: 'material-concrete',
    name: 'Concrete Stained',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'concrete-stained',
    color: { r: 0.62, g: 0.6, b: 0.58 },
    roughness: 0.95,
    metalness: 0,
    normalScale: 1,
    tileScale: 6,
    seed: 0,
  },
  {
    id: MATERIAL_CONCRETE_POROUS_ID,
    name: 'Concrete Porous',
    source: 'builtin',
    kind: 'textured',
    proceduralProfile: 'concrete-porous',
    color: { r: 0.62, g: 0.6, b: 0.58 },
    roughness: 0.88,
    metalness: 0,
    normalScale: 1,
    tileScale: 6,
    seed: 0,
  },
  {
    id: MATERIAL_GLASS_PANE_ID,
    name: 'Glass (pane)',
    source: 'builtin',
    kind: 'transmission',
    glassVariant: 'pane',
    ior: 1.52,
    roughness: 0,
    surfaceNormalScale: 0.15,
    tint: { r: 1, g: 1, b: 1 },
  },
  {
    id: MATERIAL_GLASS_SOLID_ID,
    name: 'Glass (solid)',
    source: 'builtin',
    kind: 'transmission',
    glassVariant: 'solid',
    ior: 1.52,
    roughness: 0.005,
    surfaceNormalScale: 0.2,
    tint: { r: 1, g: 1, b: 1 },
  },
  {
    id: MATERIAL_GLASS_WINE_BOTTLE_ID,
    name: 'Glass (wine bottle)',
    source: 'builtin',
    kind: 'transmission',
    glassVariant: 'solid',
    ior: 1.52,
    roughness: 0.05,
    surfaceNormalScale: 0.15,
    tint: { r: 23 / 255, g: 97 / 255, b: 50 / 255 },
  },
  {
    id: MATERIAL_GLASS_FROSTED_PANE_ID,
    name: 'Glass Frosted (pane)',
    source: 'builtin',
    kind: 'transmission',
    glassVariant: 'pane',
    ior: 1.52,
    roughness: 0.35,
    surfaceNormalScale: 0.15,
    tint: { r: 1, g: 1, b: 1 },
  },
  {
    id: MATERIAL_GLASS_FROSTED_SOLID_ID,
    name: 'Glass Frosted (solid)',
    source: 'builtin',
    kind: 'transmission',
    glassVariant: 'solid',
    ior: 1.52,
    roughness: 0.4,
    surfaceNormalScale: 0.2,
    tint: { r: 1, g: 1, b: 1 },
  },
];

function defaultBlockMaterials(): AssetMaterialSlots {
  return {
    blockMaterialId: MATERIAL_PAPER_ID,
  };
}

function defaultCylinderMaterials(): AssetMaterialSlots {
  return {
    cylinderMaterialId: MATERIAL_PAPER_ID,
  };
}

function defaultSphereMaterials(): AssetMaterialSlots {
  return {
    sphereMaterialId: MATERIAL_PAPER_ID,
  };
}

function defaultFabricClothMaterials(): AssetMaterialSlots {
  return {
    fabricClothMaterialId: MATERIAL_FABRIC_ID,
  };
}

function defaultBookMaterials(): AssetMaterialSlots {
  return {
    bookPagesMaterialId: MATERIAL_PAPER_ID,
    bookCoverMaterialId: MATERIAL_PAPER_ID,
    bookPagesTint: { r: 0.96, g: 0.95, b: 0.92 },
    bookCoverTint: { r: 1, g: 1, b: 1 },
  };
}

function defaultWallMaterials(): AssetMaterialSlots {
  return {
    wallMaterialId: MATERIAL_PAPER_ID,
    frontMaterialId: MATERIAL_GLOSSY_PRINT_ID,
  };
}

function defaultPictureMaterials(): AssetMaterialSlots {
  return {
    frameMaterialId: MATERIAL_GOLD_ID,
    backWallMaterialId: MATERIAL_PAPER_ID,
    frontMaterialId: MATERIAL_GLOSSY_PRINT_ID,
    glazingMaterialId: MATERIAL_GLASS_PANE_ID,
  };
}

function defaultPrintMaterials(): AssetMaterialSlots {
  return {
    frontMaterialId: MATERIAL_GLOSSY_PRINT_ID,
    backMaterialId: MATERIAL_GLOSSY_PRINT_ID,
    sideMaterialId: MATERIAL_PAPER_ID,
    faceTints: {},
  };
}

function defaultHandheldMaterials(): AssetMaterialSlots {
  return {
    frameMaterialId: MATERIAL_ALUMINUM_BRUSHED_ID,
    sideButtonMaterialId: MATERIAL_ALUMINUM_BRUSHED_ID,
    backWallMaterialId: MATERIAL_CHROME_ID,
    backGlassMaterialId: MATERIAL_CHROME_ID,
    frontMaterialId: MATERIAL_GLOSSY_PRINT_ID,
    glazingMaterialId: MATERIAL_GLASS_PANE_ID,
  };
}

function defaultBeverageCanMaterials(): AssetMaterialSlots {
  return {
    metalMaterialId: MATERIAL_ALUMINUM_BRUSHED_ID,
  };
}

function defaultWineBottleMaterials(): AssetMaterialSlots {
  return {
    glassMaterialId: MATERIAL_GLASS_WINE_BOTTLE_ID,
    corkMaterialId: MATERIAL_WOOD_POROUS_ID,
    capsuleFoilMaterialId: MATERIAL_GOLD_BRUSHED_ID,
    capsuleDiscMaterialId: MATERIAL_GOLD_BRUSHED_ID,
  };
}

function defaultPenMaterials(): AssetMaterialSlots {
  return {
    capMaterialId: MATERIAL_PLASTIC_MATTE_ID,
    ringMaterialId: MATERIAL_ALUMINUM_BRUSHED_ID,
    bodyMaterialId: MATERIAL_PLASTIC_SMOOTH_ID,
  };
}

function defaultWheelCarMaterials(): AssetMaterialSlots {
  return {
    tireMaterialId: MATERIAL_PLASTIC_MATTE_ID,
    rimMaterialId: MATERIAL_CHROME_ID,
  };
}

function defaultTrianglePatchMaterials(): AssetMaterialSlots {
  return {
    patchMaterialId: MATERIAL_ALUMINUM_BRUSHED_ID,
  };
}

function defaultMonitorMaterials(): AssetMaterialSlots {
  return {
    frameMaterialId: MATERIAL_ALUMINUM_BRUSHED_ID,
    sideButtonMaterialId: MATERIAL_ALUMINUM_BRUSHED_ID,
    backWallMaterialId: MATERIAL_ALUMINUM_BRUSHED_ID,
    backGlassMaterialId: MATERIAL_ALUMINUM_BRUSHED_ID,
    standBaseMaterialId: MATERIAL_ALUMINUM_BRUSHED_ID,
    standFootMaterialId: MATERIAL_ALUMINUM_BRUSHED_ID,
    frontMaterialId: MATERIAL_GLOSSY_PRINT_ID,
    glazingMaterialId: MATERIAL_GLASS_PANE_ID,
  };
}

export function defaultMaterialsForKind(assetKind: AssetKind): AssetMaterialSlots {
  if (assetKind === 'block') {return defaultBlockMaterials();}
  if (assetKind === 'cylinder') {return defaultCylinderMaterials();}
  if (assetKind === 'sphere') {return defaultSphereMaterials();}
  if (assetKind === 'wheel-car') {return defaultWheelCarMaterials();}
  if (assetKind === 'fabric-cloth') {return defaultFabricClothMaterials();}
  if (assetKind === 'book-softcover' || assetKind === 'book-hardcover') {
    return defaultBookMaterials();
  }
  if (assetKind === 'wall' || assetKind === 'wall-door') {return defaultWallMaterials();}
  if (assetKind === 'picture') {return defaultPictureMaterials();}
  if (assetKind === 'print') {return defaultPrintMaterials();}
  if (isHandheldAssetKind(assetKind)) {return defaultHandheldMaterials();}
  if (isMonitorAssetKind(assetKind)) {return defaultMonitorMaterials();}
  if (assetKind === 'beverage-can') {return defaultBeverageCanMaterials();}
  if (assetKind === 'tin-can') {return defaultBeverageCanMaterials();}
  if (assetKind === 'wine-bottle') {return defaultWineBottleMaterials();}
  if (assetKind === 'pen') {return defaultPenMaterials();}
  if (assetKind === 'triangle-patch') {return defaultTrianglePatchMaterials();}
  return {};
}

export function resolveBuiltinMaterialPreset(materialId: string): MaterialPreset | null {
  const resolvedId = migrateMaterialId(materialId);
  const preset = MATERIAL_PRESETS.find((entry) => entry.id === resolvedId);
  return preset ? cloneMaterialPreset(preset) : null;
}

/** Legacy profile id before Concrete Stained / Porous split. */
export function migrateMaterialPreset(preset: MaterialPreset): MaterialPreset {
  if (
    preset.proceduralProfile === 'concrete-porous' &&
    preset.id !== MATERIAL_CONCRETE_POROUS_ID
  ) {
    return { ...preset, proceduralProfile: 'concrete-stained' };
  }
  return preset;
}

export function cloneMaterialPreset(preset: MaterialPreset): MaterialPreset {
  const migrated = migrateMaterialPreset(preset);
  return {
    ...migrated,
    color: migrated.color ? { ...migrated.color } : undefined,
    lineColor: migrated.lineColor ? { ...migrated.lineColor } : undefined,
    tint: migrated.tint ? { ...migrated.tint } : undefined,
  };
}

export function migrateMaterialSlots(slots: AssetMaterialSlots): AssetMaterialSlots {
  const migrateId = (id?: string) => (id ? migrateMaterialId(id) : id);

  return {
    frameMaterialId: migrateId(slots.frameMaterialId),
    backWallMaterialId: migrateId(slots.backWallMaterialId),
    backGlassMaterialId: migrateId(slots.backGlassMaterialId),
    sideButtonMaterialId: migrateId(slots.sideButtonMaterialId),
    glazingMaterialId: migrateId(slots.glazingMaterialId),
    frontMaterialId: migrateId(slots.frontMaterialId),
    backMaterialId: migrateId(slots.backMaterialId),
    sideMaterialId: migrateId(slots.sideMaterialId),
    wallMaterialId: migrateId(slots.wallMaterialId),
    blockMaterialId: migrateId(slots.blockMaterialId),
    cylinderMaterialId: migrateId(slots.cylinderMaterialId),
    sphereMaterialId: migrateId(slots.sphereMaterialId),
    fabricClothMaterialId: migrateId(slots.fabricClothMaterialId),
    bookPagesMaterialId: migrateId(slots.bookPagesMaterialId),
    bookCoverMaterialId: migrateId(slots.bookCoverMaterialId),
    bookPagesTint: slots.bookPagesTint ? { ...slots.bookPagesTint } : undefined,
    bookCoverTint: slots.bookCoverTint ? { ...slots.bookCoverTint } : undefined,
    metalMaterialId: migrateId(slots.metalMaterialId),
    patchMaterialId: migrateId(slots.patchMaterialId),
    faceTints: slots.faceTints,
  };
}
