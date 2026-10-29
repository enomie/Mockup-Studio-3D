import { describe, expect, it } from 'vitest';
import { fabricClothPhysicsParamsFromPresetKey } from '@/config/fabric-physics-presets';
import { defaultFabricClothSimParams } from '@/scene/asset-fabric-cloth';
import { verletParamsFromFabricCloth } from '@/physics/cloth/verlet-params';

describe('verletParamsFromFabricCloth', () => {
  it('maps silk preset physics into VerletParams', () => {
    const physics = fabricClothPhysicsParamsFromPresetKey('silk');
    const params = verletParamsFromFabricCloth({
      physics,
      sim: defaultFabricClothSimParams(),
      sceneColliders: { colliders: [] },
      cornerIndexMap: [0, 1, 2, 3],
      pinPositionsWorld: [],
    });
    expect(params.gravityMagnitude).toBe(4.2);
    expect(params.solverIterations).toBe(5);
    expect(params.pinnedCornersCount).toBe(0);
  });
});
