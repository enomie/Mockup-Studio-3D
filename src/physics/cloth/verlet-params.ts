import type { FabricClothPhysicsParams } from '@/config/fabric-physics-presets';
import type { FabricClothSimParams, FabricClothVec3 } from '@/scene/asset-fabric-cloth';
import type { SceneColliderSnapshot } from '@/physics/cloth/scene-colliders';
import type { VerletParams } from '@/physics/cloth/types';

export interface VerletParamsFromFabricClothInput {
  physics: FabricClothPhysicsParams;
  sim: FabricClothSimParams;
  sceneColliders: SceneColliderSnapshot;
  cornerIndexMap: readonly number[];
  /** Pin positions in world space (simulation frame). */
  pinPositionsWorld: readonly FabricClothVec3[];
}

export function verletParamsFromFabricCloth(
  input: VerletParamsFromFabricClothInput,
): VerletParams {
  const { physics, sim, sceneColliders, cornerIndexMap, pinPositionsWorld } = input;
  const pinCount = Math.min(
    sim.pinnedCornersCount,
    cornerIndexMap.length,
    pinPositionsWorld.length,
  );
  const pinPositions: { x: number; y: number; z: number }[] = [];
  for (let c = 0; c < pinCount; c++) {
    const p = pinPositionsWorld[c];
    pinPositions.push({ x: p.x, y: p.y, z: p.z });
  }

  return {
    gravityMagnitude: physics.gravityMagnitude,
    damping: physics.damping,
    bendingStiffness: physics.bendingStiffness,
    friction: physics.friction,
    solverIterations: physics.solverIterations,
    sceneColliders,
    pinnedCornersCount: pinCount,
    cornerIndexMap,
    pinPositions,
  };
}
