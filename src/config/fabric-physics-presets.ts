/**
 * Silk Studio fabric physics presets — simulation tuning only (not PBR).
 * Ported from _docs/fabric-physics/src-silk-studio/config/fabricPresets.ts
 */

export type FabricPhysicsPresetKey = 'silk' | 'satin' | 'linen' | 'chiffon';

export const FABRIC_PHYSICS_PRESET_KEYS: FabricPhysicsPresetKey[] = [
  'silk',
  'satin',
  'linen',
  'chiffon',
];

export interface FabricPhysicsPresetRow {
  name: string;
  gravity: number;
  damping: number;
  bending: number;
  friction: number;
  roughness: number;
  sheen: number;
  sheenColor: number;
  anisotropy?: number;
  iridescence?: number;
}

export const FABRIC_PHYSICS_PRESETS: Record<FabricPhysicsPresetKey, FabricPhysicsPresetRow> =
  {
    silk: {
      name: 'Silk',
      gravity: 4.2,
      damping: 0.985,
      bending: 0.25,
      friction: 0.88,
      roughness: 0.32,
      sheen: 0.3,
      sheenColor: 0xd4d4d8,
    },
    satin: {
      name: 'Satin',
      gravity: 5.8,
      damping: 0.982,
      bending: 0.4,
      friction: 0.7,
      roughness: 0.22,
      sheen: 0.25,
      sheenColor: 0xe4e4e7,
    },
    linen: {
      name: 'Linen',
      gravity: 8.5,
      damping: 0.965,
      bending: 0.75,
      friction: 0.95,
      roughness: 0.75,
      sheen: 0.05,
      sheenColor: 0xa1a1aa,
      anisotropy: 0.15,
      iridescence: 0.02,
    },
    chiffon: {
      name: 'Chiffon',
      gravity: 2.2,
      damping: 0.992,
      bending: 0.08,
      friction: 0.6,
      roughness: 0.45,
      sheen: 0.2,
      sheenColor: 0xd4d4d8,
      anisotropy: 0.6,
      iridescence: 0.15,
    },
  };

export interface FabricClothPhysicsParams {
  gravityMagnitude: number;
  damping: number;
  bendingStiffness: number;
  friction: number;
  solverIterations: number;
  activePreset: FabricPhysicsPresetKey | 'custom';
}

export function createDefaultFabricClothPhysicsParams(): FabricClothPhysicsParams {
  return fabricClothPhysicsParamsFromPresetKey('silk');
}

/** UI slider ranges — aligned with `readPhysics` clamps in asset-fabric-cloth. */
export const FABRIC_CLOTH_PHYSICS_TUNING = {
  bendingStiffness: { min: 0, max: 1, step: 0.02, decimals: 2 },
  gravityMagnitude: { min: 1, max: 12, step: 0.2, decimals: 1 },
  damping: { min: 0.92, max: 0.995, step: 0.002, decimals: 3 },
  friction: { min: 0.1, max: 0.98, step: 0.02, decimals: 2 },
} as const;

export type FabricClothPhysicsScalarField = keyof Pick<
  FabricClothPhysicsParams,
  'gravityMagnitude' | 'damping' | 'bendingStiffness' | 'friction'
>;

function clampTuningValue(
  field: FabricClothPhysicsScalarField,
  value: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const { min, max } = FABRIC_CLOTH_PHYSICS_TUNING[field];
  return Math.min(max, Math.max(min, value));
}

export function fabricClothPhysicsFromPresetKey(
  key: FabricPhysicsPresetKey,
): FabricClothPhysicsParams {
  return fabricClothPhysicsParamsFromPresetKey(key);
}

export function fabricClothPhysicsWithCustomScalar(
  base: FabricClothPhysicsParams,
  field: FabricClothPhysicsScalarField,
  value: number,
): FabricClothPhysicsParams {
  return {
    ...base,
    [field]: clampTuningValue(field, value, base[field]),
    activePreset: 'custom',
  };
}

export function fabricClothPhysicsPresetDisplayName(
  activePreset: FabricClothPhysicsParams['activePreset'],
): string {
  if (activePreset === 'custom') {
    return 'Custom';
  }
  return FABRIC_PHYSICS_PRESETS[activePreset].name;
}

export function fabricClothPhysicsParamsFromPresetKey(
  key: FabricPhysicsPresetKey,
): FabricClothPhysicsParams {
  const row = FABRIC_PHYSICS_PRESETS[key];
  return {
    gravityMagnitude: row.gravity,
    damping: row.damping,
    bendingStiffness: row.bending,
    friction: row.friction,
    solverIterations: 5,
    activePreset: key,
  };
}

/** One-time default when spawning fabric-cloth from a material preset id. */
export function fabricPhysicsPresetKeyForMaterialId(
  materialId: string,
): FabricPhysicsPresetKey {
  if (materialId === 'material-silk') {
    return 'silk';
  }
  if (materialId === 'material-fabric') {
    return 'linen';
  }
  return 'linen';
}

export function fabricClothPhysicsParamsFromMaterialId(
  materialId: string,
): FabricClothPhysicsParams {
  return fabricClothPhysicsParamsFromPresetKey(
    fabricPhysicsPresetKeyForMaterialId(materialId),
  );
}
