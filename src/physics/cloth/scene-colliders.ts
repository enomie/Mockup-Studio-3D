import {
  SDF_EPS,
  sdfCappedCylinderGradientLocal,
  sdfCappedCylinderLocal,
  sdfRoundBoxGradientLocal,
  sdfRoundBoxLocal,
  sdfSphereWorld,
  transformLocalNormalToWorld,
  transformPointInverse,
  type RoundBoxHalfExtents,
} from '@/physics/cloth/sdf-primitives';

export interface RoundedBoxCollider {
  kind: 'roundedBox';
  halfExtents: RoundBoxHalfExtents;
  cornerRadius: number;
  matrixWorld: Float32Array;
  matrixWorldInverse: Float32Array;
}

export interface CappedCylinderCollider {
  kind: 'cappedCylinder';
  radius: number;
  halfHeight: number;
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

export type SceneCollider = RoundedBoxCollider | CappedCylinderCollider | SphereCollider;

export interface SceneColliderSnapshot {
  colliders: SceneCollider[];
}

function sdfForMatrixCollider(
  collider: RoundedBoxCollider | CappedCylinderCollider,
  lx: number,
  ly: number,
  lz: number,
): number {
  if (collider.kind === 'roundedBox') {
    return sdfRoundBoxLocal(lx, ly, lz, collider.halfExtents, collider.cornerRadius);
  }
  return sdfCappedCylinderLocal(lx, ly, lz, collider.radius, collider.halfHeight);
}

function gradientForMatrixCollider(
  collider: RoundedBoxCollider | CappedCylinderCollider,
  lx: number,
  ly: number,
  lz: number,
): [number, number, number] {
  if (collider.kind === 'roundedBox') {
    return sdfRoundBoxGradientLocal(lx, ly, lz, collider.halfExtents, collider.cornerRadius);
  }
  return sdfCappedCylinderGradientLocal(lx, ly, lz, collider.radius, collider.halfHeight);
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
      sdf = sdfForMatrixCollider(collider, lx, ly, lz);
    }
    const c = sdf - dHat;
    if (c < clearance) {
      clearance = c;
    }
  }

  return clearance;
}

/** Result of pushing one point out of all obstacles. Normal is valid when `touching`. */
export interface ObstacleContact {
  x: number;
  y: number;
  z: number;
  touching: boolean;
  nx: number;
  ny: number;
  nz: number;
}

/**
 * Pushes a point out of the floor (plane y = floorY) and all colliders so it keeps
 * `dHat` clearance. `touching` is set when the point ends within `slop` of a surface;
 * the normal is the one of the closest surface. Writes into `out`.
 */
export function projectPointOutOfObstacles(
  wx: number,
  wy: number,
  wz: number,
  snapshot: SceneColliderSnapshot,
  floorY: number,
  dHat: number,
  slop: number,
  out: ObstacleContact,
): ObstacleContact {
  let x = wx;
  let y = wy;
  let z = wz;
  let best = Infinity;
  out.touching = false;

  for (const collider of snapshot.colliders) {
    let gap: number;
    let nx: number;
    let ny: number;
    let nz: number;
    if (collider.kind === 'sphere') {
      const dx = x - collider.centerX;
      const dy = y - collider.centerY;
      const dz = z - collider.centerZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < SDF_EPS) {
        nx = 0;
        ny = 1;
        nz = 0;
      } else {
        nx = dx / dist;
        ny = dy / dist;
        nz = dz / dist;
      }
      gap = dist - collider.radius - dHat;
    } else {
      const [lx, ly, lz] = transformPointInverse(collider.matrixWorldInverse, x, y, z);
      gap = sdfForMatrixCollider(collider, lx, ly, lz) - dHat;
      if (gap >= slop) {continue;}
      const [glx, gly, glz] = gradientForMatrixCollider(collider, lx, ly, lz);
      [nx, ny, nz] = transformLocalNormalToWorld(collider.matrixWorld, glx, gly, glz);
    }
    if (gap >= slop) {continue;}
    if (gap < 0) {
      x -= nx * gap;
      y -= ny * gap;
      z -= nz * gap;
    }
    if (gap < best) {
      best = gap;
      out.touching = true;
      out.nx = nx;
      out.ny = ny;
      out.nz = nz;
    }
  }

  const floorGap = y - floorY;
  if (floorGap < slop) {
    if (floorGap < 0) {
      y = floorY;
    }
    if (floorGap < best) {
      out.touching = true;
      out.nx = 0;
      out.ny = 1;
      out.nz = 0;
    }
  }

  out.x = x;
  out.y = y;
  out.z = z;
  return out;
}
