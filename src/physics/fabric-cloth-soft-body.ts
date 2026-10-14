import RAPIER from '@dimforge/rapier3d-simd-compat';
import {
  DynamicDrawUsage,
  Matrix4,
  PlaneGeometry,
  Vector3,
  type BufferAttribute,
  type Mesh,
} from 'three/webgpu';
import {
  FABRIC_CLOTH_SYNC_BOUNDS_EVERY_N_FRAMES,
  FABRIC_CLOTH_SYNC_NORMALS_EVERY_N_FRAMES,
  GROUND_COLLIDER_RESTITUTION,
  PHYSICS_COLLIDER_MARGIN_M,
} from './constants';
import type { FabricClothGridSegments } from './fabric-cloth-grid';
import { fabricClothParticleMassKg, type FabricClothDrapeSimParams } from './fabric-cloth-drape';
import { writeFabricClothGridNormalsFromPositions } from './fabric-cloth-grid-normals';

const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();

function markClothPositionGpuDirty(positionAttr: BufferAttribute): void {
  if (positionAttr.usage !== DynamicDrawUsage) {
    positionAttr.usage = DynamicDrawUsage;
  }
  positionAttr.needsUpdate = true;
}

function markClothNormalGpuDirty(normalAttr: BufferAttribute): void {
  if (normalAttr.usage !== DynamicDrawUsage) {
    normalAttr.usage = DynamicDrawUsage;
  }
  normalAttr.needsUpdate = true;
}

function applyFabricClothGridNormals(mesh: Mesh, nu: number, nv: number): void {
  const positionAttr = mesh.geometry.getAttribute('position') as BufferAttribute;
  const normalAttr = mesh.geometry.getAttribute('normal') as BufferAttribute;
  writeFabricClothGridNormalsFromPositions(
    positionAttr.array as Float32Array,
    normalAttr.array as Float32Array,
    nu,
    nv,
  );
  markClothNormalGpuDirty(normalAttr);
}

export type FabricClothPlaneSegments = FabricClothGridSegments;

export interface FabricClothMeshSyncFlags {
  recomputeNormals?: boolean;
  recomputeBounds?: boolean;
}

export interface FabricClothSimSession {
  segments: FabricClothPlaneSegments;
  nu: number;
  nv: number;
  restPositions: Float32Array;
  /** Mesh world → local at physics start (fixed for the whole session). */
  inverseWorldAtSpawn: Matrix4;
  particleToVertex: Uint32Array;
}

export function fabricClothParticleCounts(segments: FabricClothGridSegments): {
  nu: number;
  nv: number;
} {
  return {
    nu: segments.segmentsW + 1,
    nv: segments.segmentsH + 1,
  };
}

export function fabricClothParticleIndex(u: number, v: number, nv: number): number {
  return u * nv + v;
}

export function fabricClothVertexIndex(u: number, v: number, nu: number): number {
  return v * nu + u;
}

export function fabricClothParticleToVertexIndex(
  particleIndex: number,
  nu: number,
  nv: number,
): number {
  const u = Math.floor(particleIndex / nv);
  const v = particleIndex % nv;
  return fabricClothVertexIndex(u, v, nu);
}

export function fabricClothVertexToParticleIndex(
  vertexIndex: number,
  nu: number,
  nv: number,
): number {
  const u = vertexIndex % nu;
  const v = Math.floor(vertexIndex / nu);
  return fabricClothParticleIndex(u, v, nv);
}

function buildFabricClothSoftBodyMaterial(
  drape: FabricClothDrapeSimParams,
): RAPIER.SoftBodyMaterial {
  const base = drape.edgeSoftness;
  const mat = RAPIER.SoftBodyMaterial.uniform(base.naturalFrequency, base.dampingRatio);
  mat.edgeSoftness = { ...drape.edgeSoftness };
  mat.bendSoftness = { ...drape.bendSoftness };
  mat.deformationDamping = drape.deformationDamping;
  mat.elasticDampingRatio = drape.elasticDampingRatio;
  return mat;
}

function buildFabricClothColliderTemplate(
  drape: FabricClothDrapeSimParams,
): RAPIER.ColliderDesc {
  return RAPIER.ColliderDesc.ball(PHYSICS_COLLIDER_MARGIN_M)
    .setFriction(drape.contactFriction)
    .setRestitution(GROUND_COLLIDER_RESTITUTION);
}

export function readFabricClothPlaneSegments(mesh: Mesh): FabricClothPlaneSegments {
  const geometry = mesh.geometry;
  if (!(geometry instanceof PlaneGeometry)) {
    throw new Error('readFabricClothPlaneSegments: expected PlaneGeometry');
  }
  return {
    segmentsW: geometry.parameters.widthSegments,
    segmentsH: geometry.parameters.heightSegments,
  };
}

/** One source of truth: mesh rest pose → Rapier cloth + frozen sync frame. */
export function prepareFabricClothSimSession(
  mesh: Mesh,
  drape: FabricClothDrapeSimParams,
): {
  session: FabricClothSimSession;
  desc: RAPIER.SoftBodyDesc;
} {
  const segments = readFabricClothPlaneSegments(mesh);
  const { nu, nv } = fabricClothParticleCounts(segments);
  const positionAttr = mesh.geometry.getAttribute('position');
  if (positionAttr.count < nu * nv) {
    throw new Error('prepareFabricClothSimSession: cloth vertex count mismatch');
  }

  mesh.updateWorldMatrix(true, true);
  const matrixWorld = mesh.matrixWorld;

  const particleToVertex = new Uint32Array(nu * nv);
  for (let p = 0; p < nu * nv; p++) {
    particleToVertex[p] = fabricClothParticleToVertexIndex(p, nu, nv);
  }

  // Particle index: p = u * nv + v  (u step → +nv, v step → +1)
  const vOrigin = particleToVertex[0];
  const vAlongU = particleToVertex[nv];
  const vAlongV = particleToVertex[1];

  const originWorld = _a.fromBufferAttribute(positionAttr, vOrigin).applyMatrix4(matrixWorld);
  const duWorld = _b
    .fromBufferAttribute(positionAttr, vAlongU)
    .applyMatrix4(matrixWorld)
    .sub(originWorld);
  const dvWorld = _c
    .fromBufferAttribute(positionAttr, vAlongV)
    .applyMatrix4(matrixWorld)
    .sub(originWorld);

  const cellAreaM2 = duWorld.length() * dvWorld.length();
  const particleMassKg = fabricClothParticleMassKg(drape, cellAreaM2);
  const mat = buildFabricClothSoftBodyMaterial(drape);
  const warp = drape.edgeSoftness;
  const weft = drape.edgeSoftness;
  const shear = drape.shearSoftness;
  const desc = RAPIER.SoftBodyDesc.clothAnisotropic(
    { x: originWorld.x, y: originWorld.y, z: originWorld.z },
    { x: duWorld.x, y: duWorld.y, z: duWorld.z },
    { x: dvWorld.x, y: dvWorld.y, z: dvWorld.z },
    nu,
    nv,
    warp,
    weft,
    shear,
  )
    .setParticleRadius(PHYSICS_COLLIDER_MARGIN_M)
    .setMaterial(mat)
    .setLinearDamping(drape.linearDamping)
    .setParticleMass(particleMassKg)
    .setSurfaceCollider(buildFabricClothColliderTemplate(drape))
    .setCanSleep(true);

  const inverseWorldAtSpawn = new Matrix4().copy(mesh.matrixWorld).invert();
  const session: FabricClothSimSession = {
    segments,
    nu,
    nv,
    restPositions: new Float32Array(positionAttr.array),
    inverseWorldAtSpawn,
    particleToVertex,
  };

  return { session, desc };
}

/** Stride for world-physics tick sync (`syncFrameIndex` ≥ 1). */
export function fabricClothMeshSyncFlagsForSimulationFrame(
  syncFrameIndex: number,
): FabricClothMeshSyncFlags {
  return {
    recomputeNormals: syncFrameIndex % FABRIC_CLOTH_SYNC_NORMALS_EVERY_N_FRAMES === 0,
    recomputeBounds: syncFrameIndex % FABRIC_CLOTH_SYNC_BOUNDS_EVERY_N_FRAMES === 0,
  };
}

export function syncFabricClothMeshFromSoftBody(
  softBody: RAPIER.SoftBody,
  mesh: Mesh,
  session: FabricClothSimSession,
  flags?: FabricClothMeshSyncFlags,
): void {
  const positionAttr = mesh.geometry.getAttribute('position');
  const positions = positionAttr.array as Float32Array;
  const { particleToVertex, inverseWorldAtSpawn } = session;
  const count = softBody.numParticles();

  for (let particleIndex = 0; particleIndex < count; particleIndex++) {
    const p = softBody.particlePosition(particleIndex);
    _a.set(p.x, p.y, p.z).applyMatrix4(inverseWorldAtSpawn);
    const o = particleToVertex[particleIndex] * 3;
    positions[o] = _a.x;
    positions[o + 1] = _a.y;
    positions[o + 2] = _a.z;
  }

  markClothPositionGpuDirty(positionAttr as BufferAttribute);

  const recomputeNormals = flags?.recomputeNormals ?? true;
  const recomputeBounds = flags?.recomputeBounds ?? true;
  if (recomputeNormals) {
    applyFabricClothGridNormals(mesh, session.nu, session.nv);
  }
  if (recomputeBounds) {
    mesh.geometry.computeBoundingSphere();
    mesh.geometry.computeBoundingBox();
  }
}

/** Max world-space error between Rapier particles and mapped mesh vertices (rest pose check). */
export function maxFabricClothRestPoseWorldError(
  softBody: RAPIER.SoftBody,
  mesh: Mesh,
  session: FabricClothSimSession,
): number {
  mesh.updateWorldMatrix(true, true);
  const positionAttr = mesh.geometry.getAttribute('position');
  let maxErr = 0;
  for (let p = 0; p < softBody.numParticles(); p++) {
    const particle = softBody.particlePosition(p);
    const vi = session.particleToVertex[p];
    _a.fromBufferAttribute(positionAttr, vi).applyMatrix4(mesh.matrixWorld);
    maxErr = Math.max(
      maxErr,
      Math.hypot(particle.x - _a.x, particle.y - _a.y, particle.z - _a.z),
    );
  }
  return maxErr;
}

export function restoreFabricClothRestPositions(mesh: Mesh, restPositions: Float32Array): void {
  const positionAttr = mesh.geometry.getAttribute('position');
  (positionAttr.array as Float32Array).set(restPositions);
  markClothPositionGpuDirty(positionAttr as BufferAttribute);
  const { nu, nv } = fabricClothParticleCounts(readFabricClothPlaneSegments(mesh));
  applyFabricClothGridNormals(mesh, nu, nv);
  mesh.geometry.computeBoundingSphere();
  mesh.geometry.computeBoundingBox();
}
