export interface PedestalConfig {
  size: number;
  height: number;
  enabled: boolean;
}

export function createDefaultPedestalConfig(): PedestalConfig {
  return {
    size: 0.3,
    height: 0.3,
    enabled: true,
  };
}
