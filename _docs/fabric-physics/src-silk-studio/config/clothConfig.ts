export interface ClothConfig {
  defaultWidth: number;
  defaultHeight: number;
  width: number;
  height: number;
  subdivX: number;
  subdivY: number;
  aspectRatio: number;
  borderThicknessMm: number;
  borderColor: string;
  baseColor: string;
  thicknessOffsetM: number;
}

export function createDefaultClothConfig(): ClothConfig {
  return {
    defaultWidth: 0.9,
    defaultHeight: 0.9,
    width: 0.9,
    height: 0.9,
    subdivX: 38,
    subdivY: 38,
    aspectRatio: 1.0,
    borderThicknessMm: 3,
    borderColor: '#87CEEB',
    baseColor: '#f7f6f2',
    thicknessOffsetM: 0.001,
  };
}
