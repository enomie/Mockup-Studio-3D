import type { SceneColliderSnapshot } from '@/physics/cloth/scene-colliders';

export type ConstraintType = 'structural' | 'shear' | 'bending';

export interface DistanceConstraint {
  i1: number;
  i2: number;
  restDist: number;
  type: ConstraintType;
}

export interface VerletState {
  numVertices: number;
  pos: Float32Array;
  oldPos: Float32Array;
  /** Penetration-free reference positions at substep start (OGC-lite bounds). */
  xPrev: Float32Array;
  pinnedFlags: Uint8Array;
  constraints: DistanceConstraint[];
}

export interface VerletParams {
  gravityMagnitude: number;
  damping: number;
  bendingStiffness: number;
  friction: number;
  solverIterations: number;
  sceneColliders: SceneColliderSnapshot;
  pinnedCornersCount: number;
  cornerIndexMap: readonly number[];
  pinPositions: readonly { x: number; y: number; z: number }[];
}
