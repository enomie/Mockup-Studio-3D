export interface SilkOptics {
  anisotropy: number;
  anisotropyRotation: number;
  sheen: number;
  sheenRoughness: number;
  sheenColor: number;
  iridescence: number;
  iridescenceIOR: number;
  weaveDepth: number;
}

export function createDefaultSilkOptics(): SilkOptics {
  return {
    anisotropy: 0.85,
    anisotropyRotation: Math.PI / 4,
    sheen: 0.3,
    sheenRoughness: 0.5,
    sheenColor: 0xd4d4d8,
    iridescence: 0.35,
    iridescenceIOR: 1.33,
    weaveDepth: 0.4,
  };
}
