import { CONTACT_D_HAT, CONTACT_SLOP } from '@/physics/cloth/contact-config';
import { vec3GetAt, vec3Set } from '@/physics/cloth/float-buffer';
import {
  projectPointOutOfObstacles,
  type ObstacleContact,
} from '@/physics/cloth/scene-colliders';
import type { VerletParams, VerletState } from '@/physics/cloth/types';

/** Simulated time per call (s); world physics ticks at a fixed 60 Hz. */
const CLOTH_FRAME_DT = 1 / 60;

const CLOTH_SUB_STEPS = 6;

const SHEAR_STIFFNESS = 0.85;

/**
 * Tangential slide per substep (m) below which a touching vertex sticks (static
 * friction). Above gravity's per-substep step (g·dt² ≈ 7.6e-5 m) so solver creep
 * cannot move resting cloth.
 */
const STATIC_FRICTION_SLIDE_M = 1.5e-4;

const _contact: ObstacleContact = { x: 0, y: 0, z: 0, touching: false, nx: 0, ny: 1, nz: 0 };

function enforcePins(state: VerletState, params: VerletParams): void {
  for (let c = 0; c < params.pinnedCornersCount; c++) {
    const vIdx = params.cornerIndexMap[c];
    const anchor = params.pinPositions[c];
    vec3Set(state.pos, vIdx, anchor.x, anchor.y, anchor.z);
    vec3Set(state.oldPos, vIdx, anchor.x, anchor.y, anchor.z);
  }
}

/** 1. Verlet prediction: oldPos becomes the substep start. */
function predict(state: VerletState, params: VerletParams, dt: number): void {
  const { pos, oldPos, numVertices, pinnedFlags } = state;
  const gravityStep = -params.gravityMagnitude * dt * dt;
  const damping = params.damping;
  for (let i = 0; i < numVertices; i++) {
    if (pinnedFlags[i] === 1) {continue;}
    const idx = i * 3;
    const [px, py, pz] = vec3GetAt(pos, idx);
    const [ox, oy, oz] = vec3GetAt(oldPos, idx);
    vec3Set(oldPos, i, px, py, pz);
    vec3Set(
      pos,
      i,
      px + (px - ox) * damping,
      py + (py - oy) * damping + gravityStep,
      pz + (pz - oz) * damping,
    );
  }
}

/** 2. One Gauss-Seidel sweep over all distance constraints. */
function solveConstraints(state: VerletState, params: VerletParams): void {
  const { pos, pinnedFlags, constraints } = state;
  const bendingStiffness = params.bendingStiffness;
  const solveBending = bendingStiffness > 0.001;
  for (const c of constraints) {
    let stiffness = 1;
    if (c.type === 'bending') {
      if (!solveBending) {continue;}
      stiffness = bendingStiffness;
    } else if (c.type === 'shear') {
      stiffness = SHEAR_STIFFNESS;
    }
    const p1Pinned = pinnedFlags[c.i1] === 1;
    const p2Pinned = pinnedFlags[c.i2] === 1;
    if (p1Pinned && p2Pinned) {continue;}

    const idx1 = c.i1 * 3;
    const idx2 = c.i2 * 3;
    const [x1, y1, z1] = vec3GetAt(pos, idx1);
    const [x2, y2, z2] = vec3GetAt(pos, idx2);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 1e-6) {continue;}

    const diff = ((dist - c.restDist) / dist) * stiffness;
    const w1 = p1Pinned ? 0 : p2Pinned ? 1 : 0.5;
    const w2 = p2Pinned ? 0 : p1Pinned ? 1 : 0.5;
    pos[idx1] = x1 + dx * diff * w1;
    pos[idx1 + 1] = y1 + dy * diff * w1;
    pos[idx1 + 2] = z1 + dz * diff * w1;
    pos[idx2] = x2 - dx * diff * w2;
    pos[idx2 + 1] = y2 - dy * diff * w2;
    pos[idx2 + 2] = z2 - dz * diff * w2;
  }
}

/** 3. Push every vertex out of floor and colliders; remember contact normals. */
function collide(state: VerletState, params: VerletParams): void {
  const { pos, numVertices, pinnedFlags, contactFlags, contactNormals } = state;
  for (let i = 0; i < numVertices; i++) {
    if (pinnedFlags[i] === 1) {continue;}
    const [x, y, z] = vec3GetAt(pos, i * 3);
    const hit = projectPointOutOfObstacles(
      x,
      y,
      z,
      params.sceneColliders,
      CONTACT_D_HAT,
      CONTACT_D_HAT,
      CONTACT_SLOP,
      _contact,
    );
    vec3Set(pos, i, hit.x, hit.y, hit.z);
    contactFlags[i] = hit.touching ? 1 : 0;
    if (hit.touching) {
      vec3Set(contactNormals, i, hit.nx, hit.ny, hit.nz);
    }
  }
}

/**
 * 4. Friction, the only place it is applied. For touching vertices the substep
 * displacement (pos − oldPos) is split along the contact normal: the tangential
 * slide is scaled by (1 − friction) or cancelled below the static threshold, and the
 * normal part is dropped from the carried velocity (inelastic contact).
 */
function applyFriction(state: VerletState, params: VerletParams): void {
  const { pos, oldPos, numVertices, pinnedFlags, contactFlags, contactNormals } = state;
  const keep = 1 - params.friction;
  const staticSq = STATIC_FRICTION_SLIDE_M * STATIC_FRICTION_SLIDE_M;
  for (let i = 0; i < numVertices; i++) {
    if (pinnedFlags[i] === 1 || contactFlags[i] !== 1) {continue;}
    const idx = i * 3;
    const [nx, ny, nz] = vec3GetAt(contactNormals, idx);
    const [px, py, pz] = vec3GetAt(pos, idx);
    const [ox, oy, oz] = vec3GetAt(oldPos, idx);
    const dx = px - ox;
    const dy = py - oy;
    const dz = pz - oz;
    const dn = dx * nx + dy * ny + dz * nz;
    let tx = dx - dn * nx;
    let ty = dy - dn * ny;
    let tz = dz - dn * nz;
    const scale = tx * tx + ty * ty + tz * tz < staticSq ? 0 : keep;
    tx *= scale;
    ty *= scale;
    tz *= scale;
    const nextX = ox + tx + dn * nx;
    const nextY = oy + ty + dn * ny;
    const nextZ = oz + tz + dn * nz;
    vec3Set(pos, i, nextX, nextY, nextZ);
    vec3Set(oldPos, i, nextX - tx, nextY - ty, nextZ - tz);
  }
}

/**
 * Advances the cloth by one frame (`CLOTH_FRAME_DT`). Each substep runs, in order:
 * predict → (constraints → collide) × iterations → friction → pins.
 */
export function simulateVerletStep(state: VerletState, params: VerletParams): void {
  const dt = CLOTH_FRAME_DT / CLOTH_SUB_STEPS;
  enforcePins(state, params);
  for (let step = 0; step < CLOTH_SUB_STEPS; step++) {
    predict(state, params, dt);
    for (let iter = 0; iter < params.solverIterations; iter++) {
      solveConstraints(state, params);
      collide(state, params);
    }
    applyFriction(state, params);
    enforcePins(state, params);
  }
}

/** Largest per-substep vertex displacement squared (m²); used for sleep detection. */
export function maxVertexStepSq(state: VerletState): number {
  const { pos, oldPos, numVertices } = state;
  let max = 0;
  for (let i = 0; i < numVertices; i++) {
    const idx = i * 3;
    const dx = pos[idx] - oldPos[idx];
    const dy = pos[idx + 1] - oldPos[idx + 1];
    const dz = pos[idx + 2] - oldPos[idx + 2];
    const sq = dx * dx + dy * dy + dz * dz;
    if (sq > max) {max = sq;}
  }
  return max;
}
