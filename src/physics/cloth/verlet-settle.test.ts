import { describe, expect, it } from 'vitest';
import { fabricClothPhysicsParamsFromPresetKey } from '@/config/fabric-physics-presets';
import { CONTACT_D_HAT } from '@/physics/cloth/contact-config';
import { buildFabricClothGridConstraints } from '@/physics/cloth/grid-constraints';
import {
  sceneObstacleClearance,
  type SceneColliderSnapshot,
} from '@/physics/cloth/scene-colliders';
import type { VerletParams, VerletState } from '@/physics/cloth/types';
import { maxVertexStepSq, simulateVerletStep } from '@/physics/cloth/verlet';

const SEG = 16;
const NX = SEG + 1;
const SIZE_M = 0.5;
const FRAMES_20S = 20 * 60;
const REST_STEP_M = 2e-5;

function boxSnapshot(): SceneColliderSnapshot {
  // Column-major translation (0.03, 0.1, 0) — off-center so the cloth drapes unevenly.
  return {
    colliders: [
      {
        kind: 'roundedBox',
        halfExtents: { x: 0.1, y: 0.1, z: 0.1 },
        cornerRadius: 0.01,
        matrixWorld: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0.03, 0.1, 0, 1]),
        matrixWorldInverse: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -0.03, -0.1, 0, 1]),
      },
    ],
  };
}

function droppedCloth(): VerletState {
  const n = NX * NX;
  const pos = new Float32Array(n * 3);
  for (let y = 0; y < NX; y++) {
    for (let x = 0; x < NX; x++) {
      const i = y * NX + x;
      pos[i * 3] = (x / SEG - 0.5) * SIZE_M;
      pos[i * 3 + 1] = 0.3 + x * 0.002;
      pos[i * 3 + 2] = (y / SEG - 0.5) * SIZE_M;
    }
  }
  return {
    numVertices: n,
    pos,
    oldPos: pos.slice(),
    pinnedFlags: new Uint8Array(n),
    constraints: buildFabricClothGridConstraints(pos, SEG, SEG),
    contactFlags: new Uint8Array(n),
    contactNormals: new Float32Array(n * 3),
  };
}

function paramsFor(
  snapshot: SceneColliderSnapshot,
  friction: number,
  pin?: { x: number; y: number; z: number },
): VerletParams {
  const physics = fabricClothPhysicsParamsFromPresetKey('silk');
  return {
    ...physics,
    friction,
    sceneColliders: snapshot,
    pinnedCornersCount: pin ? 1 : 0,
    cornerIndexMap: [0],
    pinPositions: pin ? [pin] : [],
  };
}

function centroidXZ(state: VerletState): [number, number] {
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < state.numVertices; i++) {
    cx += state.pos[i * 3];
    cz += state.pos[i * 3 + 2];
  }
  return [cx / state.numVertices, cz / state.numVertices];
}

/** Runs 20 s; returns centroid drift over the last 10 s and the final max step. */
function run(state: VerletState, params: VerletParams): { driftM: number; lastStepM: number } {
  let mid: [number, number] = [0, 0];
  for (let f = 0; f < FRAMES_20S; f++) {
    if (state.pinnedFlags[0] === 0 && params.pinnedCornersCount > 0) {state.pinnedFlags[0] = 1;}
    simulateVerletStep(state, params);
    if (f === FRAMES_20S / 2) {mid = centroidXZ(state);}
  }
  const end = centroidXZ(state);
  return {
    driftM: Math.hypot(end[0] - mid[0], end[1] - mid[1]),
    lastStepM: Math.sqrt(maxVertexStepSq(state)),
  };
}

function expectNoPenetration(state: VerletState, snapshot: SceneColliderSnapshot): void {
  for (let i = 0; i < state.numVertices; i++) {
    const x = state.pos[i * 3];
    const y = state.pos[i * 3 + 1];
    const z = state.pos[i * 3 + 2];
    expect(y).toBeGreaterThanOrEqual(CONTACT_D_HAT - 1e-4);
    expect(sceneObstacleClearance(x, y, z, snapshot, CONTACT_D_HAT)).toBeGreaterThanOrEqual(-1e-3);
  }
}

describe('cloth Verlet settles', { timeout: 30_000 }, () => {
  it('comes to rest on the floor', () => {
    const snapshot = { colliders: [] };
    const state = droppedCloth();
    const result = run(state, paramsFor(snapshot, 0.88));
    expect(result.driftM).toBeLessThan(0.001);
    expect(result.lastStepM).toBeLessThan(REST_STEP_M);
    expectNoPenetration(state, snapshot);
  });

  for (const friction of [0.1, 0.9]) {
    it(`comes to rest draped over a box (friction ${friction})`, () => {
      const snapshot = boxSnapshot();
      const state = droppedCloth();
      const result = run(state, paramsFor(snapshot, friction));
      expect(result.driftM).toBeLessThan(0.001);
      expect(result.lastStepM).toBeLessThan(REST_STEP_M);
      expectNoPenetration(state, snapshot);
    });
  }

  it('hangs still from a pin', () => {
    const snapshot = { colliders: [] };
    const state = droppedCloth();
    const pin = { x: state.pos[0], y: 0.6, z: state.pos[2] };
    const result = run(state, paramsFor(snapshot, 0.88, pin));
    expect(result.lastStepM).toBeLessThan(REST_STEP_M);
    expect(state.pos[1]).toBeCloseTo(0.6, 6);
  });
});
