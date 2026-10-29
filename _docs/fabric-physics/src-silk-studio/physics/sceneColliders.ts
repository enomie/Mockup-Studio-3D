import { CONTACT_D_HAT } from './contactConfig.ts';
import {
  SDF_EPS,
  sdfRoundBoxGradientLocal,
  sdfRoundBoxLocal,
  sdfSphereWorld,
  transformLocalNormalToWorld,
  transformPointInverse,
} from './sdfPrimitives.ts';

export interface RoundedBoxCollider {
  kind: 'roundedBox';
  halfExtents: number;
  cornerRadius: number;
  matrixWorld: Float32Array;
  matrixWorldInverse: Float32Array;
}

export interface SphereCollider {
  kind: 'sphere';
  radius: number;
  centerX: number;
  centerY: number;
  centerZ: number;
}

export type SceneCollider = RoundedBoxCollider | SphereCollider;

export interface SceneColliderSnapshot {
  colliders: SceneCollider[];
}

export interface ParticleCollisionResult {
  x: number;
  y: number;
  z: number;
  vy: number;
  oldPosY: number | null;
  slipX: number | null;
  slipZ: number | null;
}

/** Clearance to the d_hat offset obstacle surface (positive = free). */
export function sceneObstacleClearance(
  wx: number,
  wy: number,
  wz: number,
  snapshot: SceneColliderSnapshot,
  dHat: number,
): number {
  let clearance = wy - dHat;

  for (const collider of snapshot.colliders) {
    let sdf: number;
    if (collider.kind === 'sphere') {
      sdf = sdfSphereWorld(
        wx,
        wy,
        wz,
        collider.centerX,
        collider.centerY,
        collider.centerZ,
        collider.radius,
      );
    } else {
      const [lx, ly, lz] = transformPointInverse(
        collider.matrixWorldInverse,
        wx,
        wy,
        wz,
      );
      sdf = sdfRoundBoxLocal(lx, ly, lz, collider.halfExtents, collider.cornerRadius);
    }
    const c = sdf - dHat;
    if (c < clearance) {
      clearance = c;
    }
  }

  return clearance;
}

function resolveRoundedBox(
  wx: number,
  wy: number,
  wz: number,
  collider: RoundedBoxCollider,
  dHat: number,
  friction: number,
  vx: number,
  vz: number,
): ParticleCollisionResult | null {
  const [lx, ly, lz] = transformPointInverse(
    collider.matrixWorldInverse,
    wx,
    wy,
    wz,
  );
  const half = collider.halfExtents;
  const r = collider.cornerRadius;
  const dist = sdfRoundBoxLocal(lx, ly, lz, half, r);
  if (dist >= dHat) {
    return null;
  }

  const push = dHat - dist;
  const [glx, gly, glz] = sdfRoundBoxGradientLocal(lx, ly, lz, half, r);
  const [nx, ny, nz] = transformLocalNormalToWorld(collider.matrixWorld, glx, gly, glz);

  const outX = wx + nx * push;
  const outY = wy + ny * push;
  const outZ = wz + nz * push;
  let vy = 0;
  let oldPosY: number | null = null;
  let slipX: number | null = null;
  let slipZ: number | null = null;

  if (ny > 0.65) {
    vy = 0;
    oldPosY = outY;
    const slipRatio = 1.0 - friction;
    slipX = wx + vx * slipRatio;
    slipZ = wz + vz * slipRatio;
  } else if (dist < dHat * 0.5) {
    vy = 0;
  }

  return { x: outX, y: outY, z: outZ, vy, oldPosY, slipX, slipZ };
}

function resolveSphere(
  wx: number,
  wy: number,
  wz: number,
  collider: SphereCollider,
  dHat: number,
  friction: number,
  vx: number,
  vz: number,
): ParticleCollisionResult | null {
  const dx = wx - collider.centerX;
  const dy = wy - collider.centerY;
  const dz = wz - collider.centerZ;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const limit = collider.radius + dHat;
  if (dist >= limit) {
    return null;
  }
  if (dist < SDF_EPS) {
    return {
      x: wx,
      y: collider.centerY + limit,
      z: wz,
      vy: 0,
      oldPosY: null,
      slipX: null,
      slipZ: null,
    };
  }

  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;
  const push = limit - dist;
  const outX = wx + nx * push;
  const outY = wy + ny * push;
  const outZ = wz + nz * push;

  let oldPosY: number | null = null;
  let slipX: number | null = null;
  let slipZ: number | null = null;
  if (ny > 0.65) {
    oldPosY = outY;
    const slipRatio = 1.0 - friction;
    slipX = wx + vx * slipRatio;
    slipZ = wz + vz * slipRatio;
  }

  return { x: outX, y: outY, z: outZ, vy: 0, oldPosY, slipX, slipZ };
}

export function projectSceneCollisions(
  wx: number,
  wy: number,
  wz: number,
  snapshot: SceneColliderSnapshot,
  floorContactY: number,
  dHat: number = CONTACT_D_HAT,
): { x: number; y: number; z: number } {
  let x = wx;
  let y = wy;
  let z = wz;

  for (const collider of snapshot.colliders) {
    const hit =
      collider.kind === 'sphere'
        ? resolveSphere(x, y, z, collider, dHat, 0, 0, 0)
        : resolveRoundedBox(x, y, z, collider, dHat, 0, 0, 0);
    if (!hit) continue;
    x = hit.x;
    y = hit.y;
    z = hit.z;
  }

  if (y < floorContactY) {
    y = floorContactY;
  }

  return { x, y, z };
}

export function resolveSceneCollisions(
  wx: number,
  wy: number,
  wz: number,
  vx: number,
  vy: number,
  vz: number,
  snapshot: SceneColliderSnapshot,
  floorContactY: number,
  dHat: number,
  friction: number,
): { x: number; y: number; z: number; vy: number; oldPosY?: number } {
  let x = wx;
  let y = wy;
  let z = wz;
  let outVy = vy;
  let oldPosY: number | undefined;

  for (const collider of snapshot.colliders) {
    const hit =
      collider.kind === 'sphere'
        ? resolveSphere(x, y, z, collider, dHat, friction, vx, vz)
        : resolveRoundedBox(x, y, z, collider, dHat, friction, vx, vz);
    if (!hit) continue;
    x = hit.x;
    y = hit.y;
    z = hit.z;
    if (hit.vy === 0) outVy = 0;
    if (hit.oldPosY !== null) {
      oldPosY = hit.oldPosY;
      if (hit.slipX !== null) x = hit.slipX;
      if (hit.slipZ !== null) z = hit.slipZ;
    }
  }

  if (y < floorContactY) {
    y = floorContactY;
    outVy = 0;
    oldPosY = y;
    x = wx + vx * (1.0 - friction);
    z = wz + vz * (1.0 - friction);
  }

  return { x, y, z, vy: outVy, oldPosY };
}
