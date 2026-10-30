import {
  Euler,
  Matrix4,
  Vector3,
  type BufferAttribute,
  type Mesh,
  type Object3D,
} from 'three/webgpu';
import { buildFabricClothGridConstraints } from '@/physics/cloth/grid-constraints';
import { vec3Get, vec3Set } from '@/physics/cloth/float-buffer';
import type { SceneColliderSnapshot } from '@/physics/cloth/scene-colliders';
import { updateClothPlaneVertices } from '@/physics/cloth/plane-vertices';
import type { VerletParams, VerletState } from '@/physics/cloth/types';
import { maxVertexStepSq, simulateVerletStep } from '@/physics/cloth/verlet';
import { verletParamsFromFabricCloth } from '@/physics/cloth/verlet-params';
import {
  readFabricClothMeshGrid,
  type FabricClothMeshGridInfo,
} from '@/engine/fabric-cloth-geometry';
import {
  defaultFabricClothParams,
  FABRIC_CLOTH_REST_PLANE_XY_ATTR,
  type FabricClothSimParams,
  type FabricClothVec3,
} from '@/scene/asset-fabric-cloth';
import {
  FABRIC_CLOTH_SYNC_BOUNDS_EVERY_N_FRAMES,
  FABRIC_CLOTH_SYNC_NORMALS_EVERY_N_FRAMES,
} from '@/physics/constants';
import type { AssetEntity } from '@/scene/entity-types';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

const _localCenter = new Vector3();
const _world = new Vector3();
const _restPose = new Matrix4();
const _euler = new Euler();

export interface FabricClothMeshSyncFlags {
  recomputeNormals?: boolean;
  recomputeBounds?: boolean;
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

export interface FabricClothVerletBinding {
  clothMesh: Mesh;
  grid: FabricClothMeshGridInfo;
  numVertices: number;
  pos: Float32Array;
  oldPos: Float32Array;
  contactFlags: Uint8Array;
  contactNormals: Float32Array;
  pinnedFlags: Uint8Array;
  constraints: VerletState['constraints'];
  cornerIndexMap: readonly number[];
  originalLocal: Float32Array;
  restPositions: Float32Array;
  restNormals: Float32Array;
  localCenterlineScratch: Float32Array;
  syncFrameIndex: number;
  consecutiveRestFrames: number;
  /** Fingerprint of everything outside the cloth that can move it; a change wakes it. */
  wakeSignature: number;
}

function restPoseMatrix(sim: FabricClothSimParams): Matrix4 {
  _euler.set(sim.restPose.rotation.x, sim.restPose.rotation.y, sim.restPose.rotation.z);
  return _restPose.identity().makeRotationFromEuler(_euler).setPosition(
    sim.restPose.position.x,
    sim.restPose.position.y,
    sim.restPose.position.z,
  );
}

function centerlineLocalFromGrid(
  restPlane: Float32Array,
  idx: number,
  sim: FabricClothSimParams,
  out: Vector3,
): Vector3 {
  const rx = restPlane[idx * 2] ?? 0;
  const ry = restPlane[idx * 2 + 1] ?? 0;
  out.set(rx, ry, 0).applyMatrix4(restPoseMatrix(sim));
  return out;
}

function entityLocalToWorld(entityObject: Object3D, local: FabricClothVec3): Vector3 {
  return _world.set(local.x, local.y, local.z).applyMatrix4(entityObject.matrixWorld);
}

function applyPinnedSelection(
  pinnedFlags: Uint8Array,
  pinnedCornersCount: number,
  cornerIndexMap: readonly number[],
): void {
  pinnedFlags.fill(0);
  for (let c = 0; c < pinnedCornersCount; c++) {
    pinnedFlags[cornerIndexMap[c]] = 1;
  }
}

function cornerIndexMapForGrid(grid: FabricClothMeshGridInfo): number[] {
  const { segX, nx, ny } = grid;
  return [0, segX, (ny - 1) * nx, (ny - 1) * nx + segX];
}

export function createFabricClothVerletBinding(
  clothMesh: Mesh,
  entity: AssetEntity,
  entityRoot: Object3D,
): FabricClothVerletBinding {
  entityRoot.updateWorldMatrix(true, true);
  clothMesh.updateWorldMatrix(true, true);

  const grid = readFabricClothMeshGrid(clothMesh);
  const { planeVertexCount: numVertices, segX, segY } = grid;
  const fabricParams = entity.fabricClothParams ?? defaultFabricClothParams();
  const sim = fabricParams.sim;

  const restAttr = clothMesh.geometry.getAttribute(
    FABRIC_CLOTH_REST_PLANE_XY_ATTR,
  ) as BufferAttribute;
  const restPlane = restAttr.array as Float32Array;

  const pos = new Float32Array(numVertices * 3);
  const oldPos = new Float32Array(numVertices * 3);
  const originalLocal = new Float32Array(numVertices * 3);
  for (let idx = 0; idx < numVertices; idx++) {
    centerlineLocalFromGrid(restPlane, idx, sim, _localCenter);
    originalLocal[idx * 3] = _localCenter.x;
    originalLocal[idx * 3 + 1] = _localCenter.y;
    originalLocal[idx * 3 + 2] = _localCenter.z;

    _localCenter.applyMatrix4(clothMesh.matrixWorld);
    vec3Set(pos, idx, _localCenter.x, _localCenter.y, _localCenter.z);
    vec3Set(oldPos, idx, _localCenter.x, _localCenter.y, _localCenter.z);
  }

  const constraints = buildFabricClothGridConstraints(pos, segX, segY);
  const pinnedFlags = new Uint8Array(numVertices);
  const cornerIndexMap = cornerIndexMapForGrid(grid);
  applyPinnedSelection(pinnedFlags, sim.pinnedCornersCount, cornerIndexMap);

  const positionAttr = clothMesh.geometry.getAttribute('position') as BufferAttribute;
  const normalAttr = clothMesh.geometry.getAttribute('normal') as BufferAttribute;
  const restPositions = new Float32Array(positionAttr.array as Float32Array);
  const restNormals = new Float32Array(normalAttr.array as Float32Array);

  return {
    clothMesh,
    grid,
    numVertices,
    pos,
    oldPos,
    contactFlags: new Uint8Array(numVertices),
    contactNormals: new Float32Array(numVertices * 3),
    pinnedFlags,
    constraints,
    cornerIndexMap,
    originalLocal,
    restPositions,
    restNormals,
    localCenterlineScratch: new Float32Array(numVertices * 3),
    syncFrameIndex: 0,
    consecutiveRestFrames: 0,
    wakeSignature: Number.NaN,
  };
}

/** Per-substep vertex step (m) below which a frame counts as resting. */
const REST_STEP_M = 2e-5;
const REST_STEP_SQ = REST_STEP_M * REST_STEP_M;

/** Resting frames before the cloth sleeps (no stepping until woken). */
const SLEEP_AFTER_REST_FRAMES = 30;

export function isFabricClothVerletBindingAsleep(binding: FabricClothVerletBinding): boolean {
  return binding.consecutiveRestFrames >= SLEEP_AFTER_REST_FRAMES;
}

function hashNumber(hash: number, value: number): number {
  // Quantize to 0.1 mm / small angles so float noise does not wake the cloth.
  return (Math.imul(hash ^ Math.round(value * 1e4), 16777619) >>> 0);
}

/** Fingerprint of colliders, pins and physics params (the cloth's external inputs). */
function wakeSignatureOf(params: VerletParams): number {
  let h = 2166136261;
  h = hashNumber(h, params.gravityMagnitude);
  h = hashNumber(h, params.damping);
  h = hashNumber(h, params.bendingStiffness);
  h = hashNumber(h, params.friction);
  h = hashNumber(h, params.solverIterations);
  h = hashNumber(h, params.pinnedCornersCount);
  for (const p of params.pinPositions) {
    h = hashNumber(hashNumber(hashNumber(h, p.x), p.y), p.z);
  }
  for (const c of params.sceneColliders.colliders) {
    if (c.kind === 'sphere') {
      h = hashNumber(hashNumber(hashNumber(hashNumber(h, c.centerX), c.centerY), c.centerZ), c.radius);
    } else {
      for (const v of c.matrixWorld) {h = hashNumber(h, v);}
      h = hashNumber(h, c.kind === 'roundedBox' ? c.halfExtents.x + c.halfExtents.y + c.halfExtents.z : c.radius + c.halfHeight);
    }
  }
  return h;
}

export function wakeFabricClothVerletBinding(binding: FabricClothVerletBinding): void {
  binding.consecutiveRestFrames = 0;
}

export function pinPositionsWorldFromEntity(
  entityRoot: Object3D,
  sim: FabricClothSimParams,
): FabricClothVec3[] {
  const count = Math.min(4, Math.max(0, sim.pinnedCornersCount));
  const out: FabricClothVec3[] = [];
  for (let c = 0; c < count; c++) {
    const local = sim.pinCorners[c];
    const w = entityLocalToWorld(entityRoot, local);
    out.push({ x: w.x, y: w.y, z: w.z });
  }
  return out;
}

/** World Verlet centerline → cloth mesh local (pre -X rotation), for flush and bake. */
export function fabricClothMeshLocalCenterlineFromBinding(
  binding: FabricClothVerletBinding,
  out?: Float32Array,
): Float32Array {
  const { pos, numVertices, clothMesh } = binding;
  const scratch =
    out ?? new Float32Array(numVertices * 3);
  if (scratch.length < numVertices * 3) {
    throw new Error('fabricClothMeshLocalCenterlineFromBinding: output buffer too small');
  }
  clothMesh.updateWorldMatrix(true, true);
  const worldToLocal = clothMesh.matrixWorld.clone().invert();

  for (let i = 0; i < numVertices; i++) {
    const [wx, wy, wz] = vec3Get(pos, i);
    _localCenter.set(wx, wy, wz).applyMatrix4(worldToLocal);
    scratch[i * 3] = _localCenter.x;
    scratch[i * 3 + 1] = _localCenter.y;
    scratch[i * 3 + 2] = _localCenter.z;
  }
  return scratch;
}

function worldCenterlineToLocal(binding: FabricClothVerletBinding): void {
  fabricClothMeshLocalCenterlineFromBinding(binding, binding.localCenterlineScratch);
}

function flushPlaneFromWorldCenterline(
  binding: FabricClothVerletBinding,
  flags?: FabricClothMeshSyncFlags,
): void {
  worldCenterlineToLocal(binding);
  updateClothPlaneVertices(
    binding.clothMesh.geometry,
    binding.localCenterlineScratch,
    binding.grid.segX,
    binding.grid.segY,
    {
      computeNormals: flags?.recomputeNormals ?? true,
      computeBounds: flags?.recomputeBounds ?? true,
    },
  );
}

export function stepFabricClothVerletBinding(
  binding: FabricClothVerletBinding,
  entity: AssetEntity,
  entityRoot: Object3D,
  snapshot: SceneColliderSnapshot,
): void {
  const fabricParams = entity.fabricClothParams ?? defaultFabricClothParams();
  const sim = fabricParams.sim;
  applyPinnedSelection(binding.pinnedFlags, sim.pinnedCornersCount, binding.cornerIndexMap);

  const params = verletParamsFromFabricCloth({
    physics: fabricParams.physics,
    sim,
    sceneColliders: snapshot,
    cornerIndexMap: binding.cornerIndexMap,
    pinPositionsWorld: pinPositionsWorldFromEntity(entityRoot, sim),
  });

  const signature = wakeSignatureOf(params);
  if (signature !== binding.wakeSignature) {
    binding.wakeSignature = signature;
    binding.consecutiveRestFrames = 0;
  }
  if (isFabricClothVerletBindingAsleep(binding)) {
    return;
  }

  const state: VerletState = {
    numVertices: binding.numVertices,
    pos: binding.pos,
    oldPos: binding.oldPos,
    pinnedFlags: binding.pinnedFlags,
    constraints: binding.constraints,
    contactFlags: binding.contactFlags,
    contactNormals: binding.contactNormals,
  };

  simulateVerletStep(state, params);

  if (maxVertexStepSq(state) < REST_STEP_SQ) {
    binding.consecutiveRestFrames += 1;
  } else {
    binding.consecutiveRestFrames = 0;
  }

  binding.syncFrameIndex += 1;
  const flags = fabricClothMeshSyncFlagsForSimulationFrame(binding.syncFrameIndex);
  flushPlaneFromWorldCenterline(binding, flags);
}

export function worldCornerPosition(
  binding: FabricClothVerletBinding,
  cornerIndex: number,
): FabricClothVec3 | null {
  const vIdx = binding.cornerIndexMap[cornerIndex];
  const [x, y, z] = vec3Get(binding.pos, vIdx);
  return { x, y, z };
}

export function setCornerWorldPosition(
  binding: FabricClothVerletBinding,
  cornerIndex: number,
  wx: number,
  wy: number,
  wz: number,
  flushPlane = true,
): void {
  const vIdx = binding.cornerIndexMap[cornerIndex];
  vec3Set(binding.pos, vIdx, wx, wy, wz);
  vec3Set(binding.oldPos, vIdx, wx, wy, wz);
  binding.consecutiveRestFrames = 0;
  if (flushPlane) {
    flushPlaneFromWorldCenterline(binding, { recomputeBounds: true });
  }
}

const _inverseEntity = new Matrix4();
const _pinWorld = new Vector3();

export function worldToEntityLocalPin(
  entityRoot: Object3D,
  wx: number,
  wy: number,
  wz: number,
): FabricClothVec3 {
  entityRoot.updateWorldMatrix(true, true);
  _inverseEntity.copy(entityRoot.matrixWorld).invert();
  _pinWorld.set(wx, wy, wz).applyMatrix4(_inverseEntity);
  return { x: _pinWorld.x, y: _pinWorld.y, z: _pinWorld.z };
}

export function buildPinCornersEntityLocal(
  entityRoot: Object3D,
  worldPins: readonly FabricClothVec3[],
  fallback: [FabricClothVec3, FabricClothVec3, FabricClothVec3, FabricClothVec3],
): [FabricClothVec3, FabricClothVec3, FabricClothVec3, FabricClothVec3] {
  const result: FabricClothVec3[] = [];
  for (let c = 0; c < 4; c++) {
    const p = c < worldPins.length ? worldPins[c] : undefined;
    if (p === undefined) {
      result.push({ ...fallback[c] });
    } else {
      result.push(worldToEntityLocalPin(entityRoot, p.x, p.y, p.z));
    }
  }
  return result as [FabricClothVec3, FabricClothVec3, FabricClothVec3, FabricClothVec3];
}

export function applyPinWorldPositionsToBinding(
  binding: FabricClothVerletBinding,
  pinnedCornersCount: number,
  pinPositionsWorld: readonly FabricClothVec3[],
): void {
  for (let c = 0; c < pinnedCornersCount; c++) {
    const p = pinPositionsWorld[c];
    setCornerWorldPosition(binding, c, p.x, p.y, p.z, false);
  }
  flushPlaneFromWorldCenterline(binding, { recomputeBounds: true });
}

export function flushBindingPlane(binding: FabricClothVerletBinding): void {
  flushPlaneFromWorldCenterline(binding, { recomputeBounds: true });
}

export function restoreFabricClothVerletMesh(binding: FabricClothVerletBinding): void {
  const geometry = binding.clothMesh.geometry;
  const positionAttr = geometry.getAttribute('position') as BufferAttribute;
  const normalAttr = geometry.getAttribute('normal') as BufferAttribute;
  (positionAttr.array as Float32Array).set(binding.restPositions);
  (normalAttr.array as Float32Array).set(binding.restNormals);
  positionAttr.needsUpdate = true;
  normalAttr.needsUpdate = true;
  ensureGeometryTangents(geometry);
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
}
