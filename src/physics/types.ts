export type Vec3 = { x: number; y: number; z: number };

export type Quat = { x: number; y: number; z: number; w: number };

export type PhysicsTransform = {
  position: Vec3;
  rotation: Quat;
};

export type HalfExtents = { x: number; y: number; z: number };
