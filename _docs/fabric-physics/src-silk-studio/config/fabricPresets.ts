export type FabricPresetKey = 'silk' | 'satin' | 'linen' | 'chiffon';

export const FABRIC_PRESET_KEYS: FabricPresetKey[] = ['silk', 'satin', 'linen', 'chiffon'];

export interface FabricPreset {
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

export const FABRIC_PRESETS: Record<FabricPresetKey, FabricPreset> = {
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

export interface FabricPhysics {
  gravityMagnitude: number;
  damping: number;
  bendingStiffness: number;
  friction: number;
  solverIterations: number;
  activePreset: FabricPresetKey | 'custom';
}

export function createDefaultFabricPhysics(): FabricPhysics {
  return {
    gravityMagnitude: 4.2,
    damping: 0.985,
    bendingStiffness: 0.25,
    friction: 0.88,
    solverIterations: 5,
    activePreset: 'silk',
  };
}
