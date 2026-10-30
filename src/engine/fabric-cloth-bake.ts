import {
  BufferAttribute,
  type BufferGeometry,
  PlaneGeometry,
  type Mesh,
} from 'three/webgpu';
import { FABRIC_CLOTH_REST_PLANE_XY_ATTR } from '@/scene/asset-fabric-cloth';
import type { FabricClothBakedMeshPayload } from '@/scene/user-baked-asset';
import { writeClothGridNormals } from '@/physics/cloth/plane-vertices';
import { readFabricClothMeshGrid } from './fabric-cloth-geometry';
import {
  fabricClothMeshLocalCenterlineFromBinding,
  type FabricClothVerletBinding,
} from './fabric-cloth-verlet-session';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

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
): FabricClothBakedMeshPayload {
  const centerline = fabricClothMeshLocalCenterlineFromBinding(binding);
  return normalizeFabricClothBakedMeshPayload(
    bakeFabricClothMeshFromDeformed(binding.clothMesh, centerline),
  );
}

/**
 * The live grid stores row 0 at −Y; PlaneGeometry (baked payload, its uvs, rest plane
 * and triangle index) stores row 0 at +Y. Flips rows so the payload stays consistent —
 * otherwise the image is upside down and triangles wind backwards (back-face shading).
 */
function liveGridRowsToPlaneGeometryOrder(
  values: Float32Array,
  nx: number,
  ny: number,
): number[] {
  const out = new Array<number>(values.length);
  const rowStride = nx * 3;
  for (let row = 0; row < ny; row++) {
    const src = (ny - 1 - row) * rowStride;
    const dst = row * rowStride;
    for (let k = 0; k < rowStride; k++) {
      out[dst + k] = values[src + k];
    }
  }
  return out;
}

/**
 * Freezes the cloth at simulation resolution: same grid, positions and normals as
 * the live mesh, so the bake looks exactly like the simulated cloth.
 */
export function bakeFabricClothMeshFromDeformed(
  clothMesh: Mesh,
  meshLocalCenterline: Float32Array = clothMesh.geometry.getAttribute('position')
    .array as Float32Array,
): FabricClothBakedMeshPayload {
  const { segmentsW, segmentsH } = readFabricClothMeshGrid(clothMesh);
  const { planeWidthM, planeHeightM, coarsePositions } = readCoarseBakeSource(
    clothMesh,
    meshLocalCenterline,
  );

  const geometry = new PlaneGeometry(planeWidthM, planeHeightM, segmentsW, segmentsH);
  const posAttr = geometry.getAttribute('position') as BufferAttribute;
  const restPlane = new Float32Array(posAttr.count * 2);
  for (let i = 0; i < posAttr.count; i++) {
    restPlane[i * 2] = posAttr.getX(i);
    restPlane[i * 2 + 1] = posAttr.getY(i);
  }

  const nx = segmentsW + 1;
  const ny = segmentsH + 1;
  const liveNormals = new Float32Array(coarsePositions.length);
  writeClothGridNormals(coarsePositions, liveNormals, nx, ny);
  const uvs = Array.from(geometry.getAttribute('uv').array as Float32Array);
  geometry.dispose();

  const footprint = fabricClothRestPlaneFootprintM(restPlane);
  return {
    positions: liveGridRowsToPlaneGeometryOrder(coarsePositions, nx, ny),
    normals: liveGridRowsToPlaneGeometryOrder(liveNormals, nx, ny),
    uvs,
    restPlaneXY: Array.from(restPlane),
    segmentsW,
    segmentsH,
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
