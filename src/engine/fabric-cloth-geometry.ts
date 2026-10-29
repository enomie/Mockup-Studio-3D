import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Mesh,
  StaticDrawUsage,
  type Material,
} from 'three/webgpu';
import { FABRIC_CLOTH_REST_PLANE_XY_ATTR } from '@/scene/asset-fabric-cloth';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';
import {
  fabricClothGridSegments,
  type FabricClothGridSegments,
} from '@/physics/fabric-cloth-grid';

export interface BuildFabricClothMeshOptions {
  faceWidth: number;
  faceHeight: number;
  material: Material;
  /** Override segment counts (tests). */
  segments?: FabricClothGridSegments;
}

export interface FabricClothMeshGridInfo {
  segmentsW: number;
  segmentsH: number;
  segX: number;
  segY: number;
  nx: number;
  ny: number;
  planeVertexCount: number;
}

function resolveSegments(
  faceWidth: number,
  faceHeight: number,
  options: BuildFabricClothMeshOptions,
): FabricClothGridSegments {
  if (options.segments) {return options.segments;}
  return fabricClothGridSegments(faceWidth, faceHeight);
}

/**
 * Single-sided grid (idx = y * nx + x, row 0 at -Y), rendered DoubleSide.
 * Print side is +Z before mesh X-rotation (becomes entity +Y normal); triangles wind CCW
 * seen from +Z so front faces match the normals — same orientation as the baked PlaneGeometry.
 */
function buildClothPlaneGeometry(
  width: number,
  depth: number,
  segX: number,
  segY: number,
): { geometry: BufferGeometry; grid: FabricClothMeshGridInfo } {
  const nx = segX + 1;
  const ny = segY + 1;
  const planeVerts = nx * ny;

  const geometry = new BufferGeometry();
  const posArray = new Float32Array(planeVerts * 3);
  const normalArray = new Float32Array(planeVerts * 3);
  const uvsArray = new Float32Array(planeVerts * 2);
  const restPlane = new Float32Array(planeVerts * 2);
  const indices: number[] = [];

  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const idx = y * nx + x;
      const u = x / segX;
      const v = y / segY;
      const px = (u - 0.5) * width;
      const py = (v - 0.5) * depth;

      posArray[idx * 3] = px;
      posArray[idx * 3 + 1] = py;
      normalArray[idx * 3 + 2] = 1;
      uvsArray[idx * 2] = u;
      uvsArray[idx * 2 + 1] = v;
      restPlane[idx * 2] = px;
      restPlane[idx * 2 + 1] = py;
    }
  }

  for (let y = 0; y < segY; y++) {
    for (let x = 0; x < segX; x++) {
      const a = y * nx + x;
      const b = y * nx + (x + 1);
      const c = (y + 1) * nx + x;
      const d = (y + 1) * nx + (x + 1);
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const positionAttr = new BufferAttribute(posArray, 3);
  positionAttr.usage = DynamicDrawUsage;
  geometry.setAttribute('position', positionAttr);
  const normalAttr = new BufferAttribute(normalArray, 3);
  normalAttr.usage = DynamicDrawUsage;
  geometry.setAttribute('normal', normalAttr);
  geometry.setAttribute('uv', new BufferAttribute(uvsArray, 2));
  const restAttr = new BufferAttribute(restPlane, 2);
  restAttr.usage = StaticDrawUsage;
  geometry.setAttribute(FABRIC_CLOTH_REST_PLANE_XY_ATTR, restAttr);
  geometry.setIndex(indices);
  ensureGeometryTangents(geometry);
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  return {
    geometry,
    grid: {
      segmentsW: segX,
      segmentsH: segY,
      segX,
      segY,
      nx,
      ny,
      planeVertexCount: planeVerts,
    },
  };
}

export function readFabricClothMeshGrid(mesh: Mesh): FabricClothMeshGridInfo {
  const userData = mesh.userData as { fabricClothGrid?: FabricClothMeshGridInfo };
  const grid = userData.fabricClothGrid;
  if (!grid) {
    throw new Error('fabric cloth mesh missing fabricClothGrid userData');
  }
  return grid;
}

export function readFabricClothPlaneSegments(mesh: Mesh): FabricClothGridSegments {
  const { segmentsW, segmentsH } = readFabricClothMeshGrid(mesh);
  return { segmentsW, segmentsH };
}

export function buildFabricClothMeshFromOptions(
  options: BuildFabricClothMeshOptions,
): Mesh {
  const { faceWidth, faceHeight, material } = options;
  const { segmentsW, segmentsH } = resolveSegments(faceWidth, faceHeight, options);
  const { geometry, grid } = buildClothPlaneGeometry(
    faceWidth,
    faceHeight,
    segmentsW,
    segmentsH,
  );
  const mesh = new Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  Object.assign(mesh.userData, {
    isAssetScreen: true,
    assetMeshRole: 'fabricCloth',
    fabricClothGrid: grid,
  });
  return mesh;
}

export function buildFabricClothMesh(
  faceWidth: number,
  faceHeight: number,
  clothMaterial: Material,
): Mesh {
  return buildFabricClothMeshFromOptions({
    faceWidth,
    faceHeight,
    material: clothMaterial,
  });
}
