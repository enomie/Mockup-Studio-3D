export interface Vec3 { x: number; y: number; z: number }

export interface Quat { x: number; y: number; z: number; w: number }

export interface PhysicsTransform {
  position: Vec3;
  rotation: Quat;
}

export interface HalfExtents { x: number; y: number; z: number }
