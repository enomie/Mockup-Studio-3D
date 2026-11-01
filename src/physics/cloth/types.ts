import type { SceneColliderSnapshot } from '@/physics/cloth/scene-colliders';

type ConstraintType = 'structural' | 'shear' | 'bending';

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
  pinnedFlags: Uint8Array;
  constraints: DistanceConstraint[];
  /** 1 when the vertex touched floor or a collider in the last collision pass. */
  contactFlags: Uint8Array;
  /** World contact normal per vertex (valid where `contactFlags` is 1). */
  contactNormals: Float32Array;
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
