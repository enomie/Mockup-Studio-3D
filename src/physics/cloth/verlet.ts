import {
  CONTACT_D_HAT,
  CONTACT_EXTRA_PROJECTION_PASSES,
} from '@/physics/cloth/contact-config';
import {
  clampDisplacementFromPrev,
  computeVertexDisplacementBound,
} from '@/physics/cloth/displacement-bounds';
import { vec3Get, vec3GetAt, vec3Set } from '@/physics/cloth/float-buffer';
import { projectSceneCollisions, resolveSceneCollisions } from '@/physics/cloth/scene-colliders';
import type { VerletParams, VerletState } from '@/physics/cloth/types';

const SUB_STEPS = 6;

function enforcePinPositions(
  pos: Float32Array,
  oldPos: Float32Array,
  params: VerletParams,
): void {
  for (let c = 0; c < params.pinnedCornersCount; c++) {
    const vIdx = params.cornerIndexMap[c];
    const anchor = params.pinPositions[c];
    vec3Set(pos, vIdx, anchor.x, anchor.y, anchor.z);
    vec3Set(oldPos, vIdx, anchor.x, anchor.y, anchor.z);
  }
}

function copyPositions(src: Float32Array, dst: Float32Array, numVertices: number): void {
  dst.set(src.subarray(0, numVertices * 3));
}

function projectAllVertices(
  state: VerletState,
  params: VerletParams,
  floorContactY: number,
): void {
  const { pos, numVertices, pinnedFlags } = state;
  for (let i = 0; i < numVertices; i++) {
    if (pinnedFlags[i] === 1) {continue;}
    const [x, y, z] = vec3Get(pos, i);
    const projected = projectSceneCollisions(
      x,
      y,
      z,
      params.sceneColliders,
      floorContactY,
      CONTACT_D_HAT,
    );
    vec3Set(pos, i, projected.x, projected.y, projected.z);
  }
}

function clampAllBounds(
  state: VerletState,
  params: VerletParams,
  xPrev: Float32Array,
  dt: number,
): void {
  const { pos, oldPos, numVertices, pinnedFlags } = state;
  for (let i = 0; i < numVertices; i++) {
    if (pinnedFlags[i] === 1) {continue;}
    const idx = i * 3;
    const [px, py, pz] = vec3GetAt(pos, idx);
    const [ox, oy, oz] = vec3GetAt(oldPos, idx);
    const speed = Math.sqrt(
      (px - ox) * (px - ox) + (py - oy) * (py - oy) + (pz - oz) * (pz - oz),
    ) / Math.max(dt, 1e-8);
    const [prevX, prevY, prevZ] = vec3GetAt(xPrev, idx);
    const bound = computeVertexDisplacementBound(
      prevX,
      prevY,
      prevZ,
      speed,
      dt,
      params.sceneColliders,
    );
    clampDisplacementFromPrev(pos, i, xPrev, bound);
  }
}

export function simulateVerletStep(state: VerletState, params: VerletParams): void {
  const { pos, oldPos, pinnedFlags, constraints, numVertices, xPrev } = state;
  const gravity = -params.gravityMagnitude;
  const damping = params.damping;
  const bendingStiff = params.bendingStiffness;
  const tableFriction = params.friction;
  const dt = 0.016 / SUB_STEPS;
  const floorContactY = CONTACT_D_HAT;

  enforcePinPositions(pos, oldPos, params);

  for (let step = 0; step < SUB_STEPS; step++) {
    copyPositions(pos, xPrev, numVertices);

    for (let i = 0; i < numVertices; i++) {
      if (pinnedFlags[i] === 1) {continue;}

      const [px, py, pz] = vec3Get(pos, i);
      const idx = i * 3;
      const [ox, oy, oz] = vec3GetAt(oldPos, idx);

      const vx = (px - ox) * damping;
      const vy = (py - oy) * damping + gravity * dt * dt;
      const vz = (pz - oz) * damping;

      vec3Set(oldPos, i, px, py, pz);

      let nextX = px + vx;
      let nextY = py + vy;
      let nextZ = pz + vz;

      const resolved = resolveSceneCollisions(
        nextX,
        nextY,
        nextZ,
        vx,
        vy,
        vz,
        params.sceneColliders,
        floorContactY,
        CONTACT_D_HAT,
        tableFriction,
      );
      nextX = resolved.x;
      nextY = resolved.y;
      nextZ = resolved.z;
      if (resolved.oldPosY !== undefined) {
        oldPos[idx + 1] = resolved.oldPosY;
      }

      vec3Set(pos, i, nextX, nextY, nextZ);
    }

    for (let iter = 0; iter < params.solverIterations; iter++) {
      for (const c of constraints) {
        let stiff = 1.0;
        if (c.type === 'bending') {
          stiff = bendingStiff;
          if (stiff <= 0.001) {continue;}
        } else if (c.type === 'shear') {
          stiff = 0.85;
        }

        const i1 = c.i1;
        const i2 = c.i2;
        const idx1 = i1 * 3;
        const idx2 = i2 * 3;

        const [x1, y1, z1] = vec3GetAt(pos, idx1);
        const [x2, y2, z2] = vec3GetAt(pos, idx2);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 1e-6) {continue;}

        const diff = ((dist - c.restDist) / dist) * stiff;
        const p1Pinned = pinnedFlags[i1];
        const p2Pinned = pinnedFlags[i2];

        if (p1Pinned && p2Pinned) {continue;}

        const weight1 = p1Pinned ? 0 : p2Pinned ? 1 : 0.5;
        const weight2 = p2Pinned ? 0 : p1Pinned ? 1 : 0.5;

        pos[idx1] = x1 + dx * diff * weight1;
        pos[idx1 + 1] = y1 + dy * diff * weight1;
        pos[idx1 + 2] = z1 + dz * diff * weight1;

        pos[idx2] = x2 - dx * diff * weight2;
        pos[idx2 + 1] = y2 - dy * diff * weight2;
        pos[idx2 + 2] = z2 - dz * diff * weight2;
      }

      clampAllBounds(state, params, xPrev, dt);
      projectAllVertices(state, params, floorContactY);
      copyPositions(pos, xPrev, numVertices);
    }

    for (let pass = 0; pass < CONTACT_EXTRA_PROJECTION_PASSES; pass++) {
      projectAllVertices(state, params, floorContactY);
    }

    enforcePinPositions(pos, oldPos, params);
  }
}
