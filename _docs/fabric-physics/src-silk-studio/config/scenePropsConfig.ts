export interface Vec3M {
  x: number;
  y: number;
  z: number;
}

export interface EulerDeg {
  x: number;
  y: number;
  z: number;
}

export interface CubePropConfig {
  size: number;
  cornerRadius: number;
  position: Vec3M;
  rotationEulerDeg: EulerDeg;
}

export interface SpherePropConfig {
  radius: number;
  position: Vec3M;
  rotationEulerDeg: EulerDeg;
}

export interface ScenePropsState {
  cube: CubePropConfig;
  sphere: SpherePropConfig;
}

const DEFAULT_CUBE_SIZE = 0.3;
const DEFAULT_SPHERE_RADIUS = 0.15;
const DEFAULT_CORNER_RADIUS = 0.03;

export function createDefaultSceneProps(): ScenePropsState {
  return {
    cube: {
      size: DEFAULT_CUBE_SIZE,
      cornerRadius: DEFAULT_CORNER_RADIUS,
      position: { x: 0, y: DEFAULT_CUBE_SIZE / 2, z: 0 },
      rotationEulerDeg: { x: 0, y: 0, z: 0 },
    },
    sphere: {
      radius: DEFAULT_SPHERE_RADIUS,
      position: { x: 0.35, y: DEFAULT_SPHERE_RADIUS, z: 0 },
      rotationEulerDeg: { x: 0, y: 0, z: 0 },
    },
  };
}

export function clampCubeCornerRadius(size: number, cornerRadius: number): number {
  const maxR = size / 2 - 0.001;
  return Math.min(Math.max(cornerRadius, 0), maxR);
}
