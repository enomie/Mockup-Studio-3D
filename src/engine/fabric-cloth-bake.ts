import {
  BufferAttribute,
  type BufferGeometry,
  PlaneGeometry,
  type Mesh,
} from 'three/webgpu';
import {
  FABRIC_CLOTH_BAKE_CELL_SIZE_M,
  FABRIC_CLOTH_BAKE_MAX_VERTICES,
  FABRIC_CLOTH_BAKE_SUBDIV_FACTOR,
  FABRIC_CLOTH_SIM_MIN_SEGMENTS_PER_AXIS,
} from '@/physics/constants';
import { FABRIC_CLOTH_REST_PLANE_XY_ATTR } from '@/scene/asset-fabric-cloth';
import type { FabricClothBakedMeshPayload } from '@/scene/user-baked-asset';
import { writeFabricClothGridNormalsFromPositions } from '@/physics/fabric-cloth-grid-normals';
import { readFabricClothMeshGrid } from './fabric-cloth-geometry';
import {
  fabricClothMeshLocalCenterlineFromBinding,
  type FabricClothVerletBinding,
} from './fabric-cloth-verlet-session';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

function segmentsForBakeExtent(extentM: number): number {
  if (extentM <= 0) {
    return FABRIC_CLOTH_SIM_MIN_SEGMENTS_PER_AXIS;
  }
  return Math.max(
    FABRIC_CLOTH_SIM_MIN_SEGMENTS_PER_AXIS,
    Math.ceil(extentM / FABRIC_CLOTH_BAKE_CELL_SIZE_M),
  );
}

function clampBakeSegmentsToMaxVertices(
  segmentsW: number,
  segmentsH: number,
): { segmentsW: number; segmentsH: number } {
  let sw = Math.max(1, segmentsW);
  let sh = Math.max(1, segmentsH);
  while ((sw + 1) * (sh + 1) > FABRIC_CLOTH_BAKE_MAX_VERTICES) {
    if (sw >= sh && sw > 1) {
      sw -= 1;
    } else if (sh > 1) {
      sh -= 1;
    } else {
      break;
    }
  }
  return { segmentsW: sw, segmentsH: sh };
}

function resolveDenseBakeSegments(
  coarseSegmentsW: number,
  coarseSegmentsH: number,
  planeWidthM: number,
  planeHeightM: number,
  subdivFactor: number,
): { segmentsW: number; segmentsH: number } {
  const fromFactor = {
    segmentsW: Math.max(1, coarseSegmentsW * subdivFactor),
    segmentsH: Math.max(1, coarseSegmentsH * subdivFactor),
  };
  const fromCell = {
    segmentsW: segmentsForBakeExtent(planeWidthM),
    segmentsH: segmentsForBakeExtent(planeHeightM),
  };
  return clampBakeSegmentsToMaxVertices(
    Math.max(fromFactor.segmentsW, fromCell.segmentsW),
    Math.max(fromFactor.segmentsH, fromCell.segmentsH),
  );
}

export function expectedBakedVertexCount(
  payload: Pick<FabricClothBakedMeshPayload, 'segmentsW' | 'segmentsH'>,
): number {
  return (payload.segmentsW + 1) * (payload.segmentsH + 1);
}

const REST_PLANE_EXTENT_EPSILON_M = 1e-5;

interface RestPlaneBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function restPlaneBoundsFromXY(restPlaneXY: ArrayLike<number>): RestPlaneBounds {
  if (restPlaneXY.length % 2 !== 0) {
    throw new Error('fabricClothRestPlaneFootprintM: restPlaneXY length must be even');
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < restPlaneXY.length; i += 2) {
    const x = restPlaneXY[i];
    const y = restPlaneXY[i + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { minX, maxX, minY, maxY };
}

/** Footprint in meters from serialized rest-plane coordinates (max − min per axis). */
export function fabricClothRestPlaneFootprintM(
  restPlaneXY: ArrayLike<number>,
): Pick<FabricClothBakedMeshPayload, 'planeWidthM' | 'planeHeightM'> {
  const { minX, maxX, minY, maxY } = restPlaneBoundsFromXY(restPlaneXY);
  const planeWidthM = maxX - minX;
  const planeHeightM = maxY - minY;
  if (planeWidthM <= 0 || planeHeightM <= 0) {
    throw new Error('fabricClothRestPlaneFootprintM: degenerate restPlaneXY extents');
  }
  if (
    Math.abs(minX + maxX) > REST_PLANE_EXTENT_EPSILON_M ||
    Math.abs(minY + maxY) > REST_PLANE_EXTENT_EPSILON_M
  ) {
    throw new Error(
      'fabricClothRestPlaneFootprintM: restPlaneXY must be centered at origin for border TSL',
    );
  }
  return { planeWidthM, planeHeightM };
}

const BASE_PIVOT_EPSILON_M = 1e-6;

/**
 * Offset that moves baked vertices to the base pivot: footprint centered on the
 * entity origin (X/Z) with the lowest point at entity Y = 0. Positions are cloth-mesh
 * local, the mesh is rotated −90° about X, so entity X = x, Y = z, Z = −y.
 */
function basePivotOffset(positions: readonly number[]): [number, number, number] {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    maxX = Math.max(maxX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    maxY = Math.max(maxY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]);
  }
  if (positions.length === 0) {
    return [0, 0, 0];
  }
  return [-(minX + maxX) * 0.5, -(minY + maxY) * 0.5, -minZ];
}

/**
 * Canonical baked payload: plane size matches `restPlaneXY` (source of truth for the
 * border mask) and vertices sit on the base pivot, so the cloth rests on the ground
 * at entity Y = 0 and the gizmo sits at its base. Also repairs legacy payloads that
 * kept the pre-drop entity origin (cloth below ground, gizmo above it).
 */
export function normalizeFabricClothBakedMeshPayload(
  payload: FabricClothBakedMeshPayload,
): FabricClothBakedMeshPayload {
  const footprint = fabricClothRestPlaneFootprintM(payload.restPlaneXY);
  const [ox, oy, oz] = basePivotOffset(payload.positions);
  const sizeMatches =
    Math.abs(payload.planeWidthM - footprint.planeWidthM) < REST_PLANE_EXTENT_EPSILON_M &&
    Math.abs(payload.planeHeightM - footprint.planeHeightM) < REST_PLANE_EXTENT_EPSILON_M;
  const pivotMatches =
    Math.abs(ox) < BASE_PIVOT_EPSILON_M &&
    Math.abs(oy) < BASE_PIVOT_EPSILON_M &&
    Math.abs(oz) < BASE_PIVOT_EPSILON_M;
  if (sizeMatches && pivotMatches) {
    return payload;
  }
  const positions = pivotMatches
    ? payload.positions
    : payload.positions.map((v, i) => v + (i % 3 === 0 ? ox : i % 3 === 1 ? oy : oz));
  return {
    ...payload,
    positions,
    planeWidthM: footprint.planeWidthM,
    planeHeightM: footprint.planeHeightM,
  };
}

/** Ensures rest plane is usable for border TSL (centered, non-degenerate). */
export function validateFabricClothBakedRestPlaneExtents(
  payload: Pick<FabricClothBakedMeshPayload, 'restPlaneXY'>,
): void {
  fabricClothRestPlaneFootprintM(payload.restPlaneXY);
}

function sampleCoarsePosition(
  positions: Float32Array,
  nu: number,
  nv: number,
  u: number,
  v: number,
): [number, number, number] {
  const u0 = Math.min(Math.floor(u), nu - 2);
  const v0 = Math.min(Math.floor(v), nv - 2);
  const fu = u - u0;
  const fv = v - v0;

  const idx = (uu: number, vv: number) => (vv * nu + uu) * 3;

  const x00 = positions[idx(u0, v0)];
  const y00 = positions[idx(u0, v0) + 1];
  const z00 = positions[idx(u0, v0) + 2];

  const x10 = positions[idx(u0 + 1, v0)];
  const y10 = positions[idx(u0 + 1, v0) + 1];
  const z10 = positions[idx(u0 + 1, v0) + 2];

  const x01 = positions[idx(u0, v0 + 1)];
  const y01 = positions[idx(u0, v0 + 1) + 1];
  const z01 = positions[idx(u0, v0 + 1) + 2];

  const x11 = positions[idx(u0 + 1, v0 + 1)];
  const y11 = positions[idx(u0 + 1, v0 + 1) + 1];
  const z11 = positions[idx(u0 + 1, v0 + 1) + 2];

  const x0 = x00 * (1 - fu) + x10 * fu;
  const x1 = x01 * (1 - fu) + x11 * fu;
  const y0 = y00 * (1 - fu) + y10 * fu;
  const y1 = y01 * (1 - fu) + y11 * fu;
  const z0 = z00 * (1 - fu) + z10 * fu;
  const z1 = z01 * (1 - fu) + z11 * fu;

  return [
    x0 * (1 - fv) + x1 * fv,
    y0 * (1 - fv) + y1 * fv,
    z0 * (1 - fv) + z1 * fv,
  ];
}

interface CoarseBakeSource {
  planeWidthM: number;
  planeHeightM: number;
  coarsePositions: Float32Array;
}

function restPlaneExtentsFromMesh(clothMesh: Mesh, planeVertexCount: number): {
  planeWidthM: number;
  planeHeightM: number;
} {
  const geometry = clothMesh.geometry;
  const restAttr = geometry.getAttribute(FABRIC_CLOTH_REST_PLANE_XY_ATTR);
  if (restAttr.count < planeVertexCount) {
    throw new Error('bakeFabricClothMeshFromDeformed: missing rest plane attribute');
  }
  const restPlane = restAttr.array as Float32Array;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < planeVertexCount; i++) {
    const x = restPlane[i * 2];
    const y = restPlane[i * 2 + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { planeWidthM: maxX - minX, planeHeightM: maxY - minY };
}

function readCoarseBakeSource(
  clothMesh: Mesh,
  meshLocalCenterline: Float32Array,
): CoarseBakeSource {
  const grid = readFabricClothMeshGrid(clothMesh);
  const vertexValues = grid.planeVertexCount * 3;
  if (meshLocalCenterline.length < vertexValues) {
    throw new Error('bakeFabricClothMeshFromDeformed: centerline buffer too small');
  }
  const { planeWidthM, planeHeightM } = restPlaneExtentsFromMesh(
    clothMesh,
    grid.planeVertexCount,
  );
  return {
    planeWidthM,
    planeHeightM,
    coarsePositions: meshLocalCenterline.slice(0, vertexValues),
  };
}

export function bakeFabricClothMeshFromVerletBinding(
  binding: FabricClothVerletBinding,
  subdivFactor: number = FABRIC_CLOTH_BAKE_SUBDIV_FACTOR,
): FabricClothBakedMeshPayload {
  const centerline = fabricClothMeshLocalCenterlineFromBinding(binding);
  const payload = bakeFabricClothMeshFromDeformed(
    binding.clothMesh,
    subdivFactor,
    centerline,
  );
  return normalizeFabricClothBakedMeshPayload(payload);
}

export function bakeFabricClothMeshFromDeformed(
  clothMesh: Mesh,
  subdivFactor: number = FABRIC_CLOTH_BAKE_SUBDIV_FACTOR,
  meshLocalCenterline: Float32Array = clothMesh.geometry.getAttribute('position')
    .array as Float32Array,
): FabricClothBakedMeshPayload {
  const coarseSegments = readFabricClothMeshGrid(clothMesh);
  const nu = coarseSegments.segmentsW + 1;
  const nv = coarseSegments.segmentsH + 1;

  const { planeWidthM, planeHeightM, coarsePositions: coarsePos } = readCoarseBakeSource(
    clothMesh,
    meshLocalCenterline,
  );
  const denseSegments = resolveDenseBakeSegments(
    coarseSegments.segmentsW,
    coarseSegments.segmentsH,
    planeWidthM,
    planeHeightM,
    subdivFactor,
  );

  const denseGeometry = new PlaneGeometry(
    planeWidthM,
    planeHeightM,
    denseSegments.segmentsW,
    denseSegments.segmentsH,
  );

  const densePosAttr = denseGeometry.getAttribute('position') as BufferAttribute;
  const densePositions = densePosAttr.array as Float32Array;

  const halfW = planeWidthM * 0.5;
  const halfH = planeHeightM * 0.5;

  const restPlane = new Float32Array(densePosAttr.count * 2);
  for (let i = 0; i < densePosAttr.count; i++) {
    restPlane[i * 2] = densePosAttr.getX(i);
    restPlane[i * 2 + 1] = densePosAttr.getY(i);
  }

  for (let i = 0; i < densePosAttr.count; i++) {
    const rx = restPlane[i * 2];
    const ry = restPlane[i * 2 + 1];
    const u = ((rx + halfW) / planeWidthM) * (nu - 1);
    const v = ((ry + halfH) / planeHeightM) * (nv - 1);
    const [x, y, z] = sampleCoarsePosition(coarsePos, nu, nv, u, v);
    densePositions[i * 3] = x;
    densePositions[i * 3 + 1] = y;
    densePositions[i * 3 + 2] = z;
  }

  const denseNu = denseSegments.segmentsW + 1;
  const denseNv = denseSegments.segmentsH + 1;
  const normalAttr = denseGeometry.getAttribute('normal') as BufferAttribute;
  writeFabricClothGridNormalsFromPositions(
    densePositions,
    normalAttr.array as Float32Array,
    denseNu,
    denseNv,
  );

  denseGeometry.setAttribute(
    FABRIC_CLOTH_REST_PLANE_XY_ATTR,
    new BufferAttribute(restPlane, 2),
  );

  const uvAttr = denseGeometry.getAttribute('uv') as BufferAttribute;
  const uvArray = uvAttr.array as Float32Array;

  const bakedSegmentsW = denseGeometry.parameters.widthSegments;
  const bakedSegmentsH = denseGeometry.parameters.heightSegments;
  const footprint = fabricClothRestPlaneFootprintM(restPlane);

  return {
    positions: Array.from(densePositions),
    normals: Array.from(normalAttr.array as Float32Array),
    uvs: Array.from(uvArray),
    restPlaneXY: Array.from(restPlane),
    segmentsW: bakedSegmentsW,
    segmentsH: bakedSegmentsH,
    planeWidthM: footprint.planeWidthM,
    planeHeightM: footprint.planeHeightM,
  };
}

export function buildBufferGeometryFromBakedMeshPayload(
  payload: FabricClothBakedMeshPayload,
): BufferGeometry {
  const mesh = normalizeFabricClothBakedMeshPayload(payload);
  validateFabricClothBakedRestPlaneExtents(mesh);
  const expectedVerts = expectedBakedVertexCount(mesh);
  const positionValues = mesh.positions.length / 3;
  if (positionValues !== expectedVerts) {
    throw new Error(
      `buildBufferGeometryFromBakedMeshPayload: vertex count mismatch (${positionValues} positions vs ${expectedVerts} for ${mesh.segmentsW}x${mesh.segmentsH} segments)`,
    );
  }

  // Must keep PlaneGeometry triangle index — non-indexed draw scrambles the grid (shredded bake).
  const geometry = new PlaneGeometry(
    mesh.planeWidthM,
    mesh.planeHeightM,
    mesh.segmentsW,
    mesh.segmentsH,
  );

  const positionAttr = geometry.getAttribute('position') as BufferAttribute;
  (positionAttr.array as Float32Array).set(mesh.positions);
  positionAttr.needsUpdate = true;

  const normalAttr = geometry.getAttribute('normal') as BufferAttribute;
  (normalAttr.array as Float32Array).set(mesh.normals);
  normalAttr.needsUpdate = true;

  const uvAttr = geometry.getAttribute('uv') as BufferAttribute;
  (uvAttr.array as Float32Array).set(mesh.uvs);
  uvAttr.needsUpdate = true;

  geometry.setAttribute(
    FABRIC_CLOTH_REST_PLANE_XY_ATTR,
    new BufferAttribute(new Float32Array(mesh.restPlaneXY), 2),
  );

  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  ensureGeometryTangents(geometry);
  return geometry;
}
