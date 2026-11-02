/** Built-in UI name: Paper (finish slider matt ↔ glossy). */
export const MATERIAL_PAPER_ID = 'material-paper';
export const MATERIAL_GOLD_ID = 'material-gold';
/** Load migration only: former Print Glossy preset → Paper with gloss 1. */
export const LEGACY_MATERIAL_GLOSSY_PRINT_ID = 'material-glossy-print';
export const MATERIAL_CHROME_ID = 'material-chrome';
export const MATERIAL_GOLD_BRUSHED_ID = 'material-gold-brushed';
/** ID spelling british; UI name: Brushed Aluminum */
export const MATERIAL_ALUMINUM_BRUSHED_ID = 'material-aluminium-brushed';
export const MATERIAL_PLASTIC_MATTE_ID = 'material-plastic-matte';
export const MATERIAL_PLASTIC_SMOOTH_ID = 'material-plastic-smooth';
export const MATERIAL_GLASS_PANE_ID = 'material-glass-pane';
export const MATERIAL_GLASS_SOLID_ID = 'material-glass-solid';
export const MATERIAL_GLASS_WINE_BOTTLE_ID = 'material-glass-wine-bottle';
export const MATERIAL_WOOD_POROUS_ID = 'material-wood-porous';
export const MATERIAL_CONCRETE_POROUS_ID = 'material-concrete-porous';
export const MATERIAL_FABRIC_ID = 'material-fabric';
export const MATERIAL_GLASS_FROSTED_PANE_ID = 'material-glass-frosted-pane';
export const MATERIAL_GLASS_FROSTED_SOLID_ID = 'material-glass-frosted-solid';
export const MATERIAL_GRID_PAPER_ID = 'material-grid-paper';
export const MATERIAL_GRID_LINES_ID = 'material-grid-lines';
export const MATERIAL_PAINT_METALLIC_ID = 'material-paint-metallic';
export const MATERIAL_ZEBRA_ANALYSIS_ID = 'material-zebra-analysis';
export const MATERIAL_WIREFRAME_ID = 'material-wireframe';

/** Load migration: material-silver → material-chrome. */
const LEGACY_MATERIAL_SILVER_ID = 'material-silver';

const LEGACY_MATERIAL_ID_MAP: Readonly<Record<string, string>> = {
  [LEGACY_MATERIAL_SILVER_ID]: MATERIAL_CHROME_ID,
  [LEGACY_MATERIAL_GLOSSY_PRINT_ID]: MATERIAL_PAPER_ID,
};

export function migrateMaterialId(materialId: string): string {
  return LEGACY_MATERIAL_ID_MAP[materialId] ?? materialId;
}
