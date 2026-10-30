import { Object3D } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { fabricClothPhysicsParamsFromPresetKey } from '@/config/fabric-physics-presets';
import { CONTACT_D_HAT } from '@/physics/cloth/contact-config';
import {
  colliderWorldMatricesFromObject,
  worldPointFromObjectLocal,
} from '@/physics/cloth/collider-world-matrix';
import { buildFabricClothGridConstraints } from '@/physics/cloth/grid-constraints';
import {
  sceneObstacleClearance,
  type SceneColliderSnapshot,
} from '@/physics/cloth/scene-colliders';
import { vec3Get } from '@/physics/cloth/float-buffer';
import type { VerletState } from '@/physics/cloth/types';
import { simulateVerletStep } from '@/physics/cloth/verlet';
import { verletParamsFromFabricCloth } from '@/physics/cloth/verlet-params';
import { defaultBlockParams } from '@/scene/asset-block';
import { blockColliderShapeFromParams } from '@/physics/block-collider-shape';
import { defaultFabricClothSimParams } from '@/scene/asset-fabric-cloth';
import { defaultSphereParams } from '@/scene/asset-sphere';
import { sphereColliderShapeFromParams } from '@/physics/sphere-collider-shape';

const CLEARANCE_EPS = 1e-4;
const FLOOR_EPS = 1e-4;
const SIM_FRAMES = 160;

function buildFlatGridState(
  segX: number,
  segY: number,
  clothY: number,
  widthM: number,
  depthM: number,
): VerletState {
  const nx = segX + 1;
  const ny = segY + 1;
  const numVertices = nx * ny;
  const pos = new Float32Array(numVertices * 3);
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const i = y * nx + x;
      pos[i * 3] = (x / segX - 0.5) * widthM;
      pos[i * 3 + 1] = clothY;
      pos[i * 3 + 2] = (y / segY - 0.5) * depthM;
    }
  }
  const oldPos = new Float32Array(pos);
  const pinnedFlags = new Uint8Array(numVertices);
  const constraints = buildFabricClothGridConstraints(pos, segX, segY);
  return {
    numVertices,
    pos,
    oldPos,
    pinnedFlags,
    constraints,
    contactFlags: new Uint8Array(numVertices),
    contactNormals: new Float32Array(numVertices * 3),
  };
}

function blockUnderClothSnapshot(): SceneColliderSnapshot {
  const shape = blockColliderShapeFromParams(defaultBlockParams());
  const object = new Object3D();
  const { matrixWorld, matrixWorldInverse } = colliderWorldMatricesFromObject(
    object,
    shape.centerOffsetY,
  );
  return {
    colliders: [
      {
        kind: 'roundedBox',
        halfExtents: { ...shape.halfExtents },
        cornerRadius: shape.borderRadiusM,
        matrixWorld,
        matrixWorldInverse,
      },
    ],
  };
}

function sphereUnderClothSnapshot(): SceneColliderSnapshot {
  const shape = sphereColliderShapeFromParams(defaultSphereParams());
  const object = new Object3D();
  const center = worldPointFromObjectLocal(object, 0, shape.centerOffsetY, 0);
  return {
    colliders: [
      {
        kind: 'sphere',
        radius: shape.colliderRadiusM,
        centerX: center.x,
        centerY: center.y,
        centerZ: center.z,
      },
    ],
  };
}

function runClothDrop(snapshot: SceneColliderSnapshot): VerletState {
  const segX = 8;
  const segY = 8;
  const widthM = 0.28;
  const depthM = 0.28;
  const clothY = 0.55;
  const state = buildFlatGridState(segX, segY, clothY, widthM, depthM);
  const physics = fabricClothPhysicsParamsFromPresetKey('silk');
  const params = verletParamsFromFabricCloth({
    physics,
    sim: defaultFabricClothSimParams(),
    sceneColliders: snapshot,
    cornerIndexMap: [],
    pinPositionsWorld: [],
  });

  for (let frame = 0; frame < SIM_FRAMES; frame++) {
    simulateVerletStep(state, params);
  }
  return state;
}

function assertNoPenetration(state: VerletState, snapshot: SceneColliderSnapshot): void {
  for (let i = 0; i < state.numVertices; i++) {
    const [x, y, z] = vec3Get(state.pos, i);
    const clearance = sceneObstacleClearance(x, y, z, snapshot, CONTACT_D_HAT);
    expect(clearance).toBeGreaterThanOrEqual(-CLEARANCE_EPS);
    expect(y).toBeGreaterThanOrEqual(CONTACT_D_HAT - FLOOR_EPS);
  }
}

describe('cloth Verlet collider integration', () => {
  it('settled grid does not penetrate a block obstacle', () => {
    const snapshot = blockUnderClothSnapshot();
    const state = runClothDrop(snapshot);
    assertNoPenetration(state, snapshot);
  });

  it('settled grid does not penetrate a sphere obstacle', () => {
    const snapshot = sphereUnderClothSnapshot();
    const state = runClothDrop(snapshot);
    assertNoPenetration(state, snapshot);
  });
});
