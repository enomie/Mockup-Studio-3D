import {
  BufferAttribute,
  DynamicDrawUsage,
  Mesh,
  PlaneGeometry,
  StaticDrawUsage,
  type Material,
} from 'three/webgpu';
import { FABRIC_CLOTH_REST_PLANE_XY_ATTR } from '@/scene/asset-fabric-cloth';
import {
  DEFAULT_FABRIC_CLOTH_SIM_QUALITY,
  fabricClothGridSegments,
  type FabricClothGridSegments,
  type FabricClothSimQuality,
} from '@/physics/fabric-cloth-grid';
import { writeFabricClothGridNormalsFromPositions } from '@/physics/fabric-cloth-grid-normals';

export interface BuildFabricClothMeshOptions {
  faceWidth: number;
  faceHeight: number;
  material: Material;
  simQuality?: FabricClothSimQuality;
  /** Override segment counts (tests). */
  segments?: FabricClothGridSegments;
}

function resolveSegments(
  faceWidth: number,
  faceHeight: number,
  options: BuildFabricClothMeshOptions,
): FabricClothGridSegments {
  if (options.segments) {return options.segments;}
  return fabricClothGridSegments(
    faceWidth,
    faceHeight,
    options.simQuality ?? DEFAULT_FABRIC_CLOTH_SIM_QUALITY,
  );
}

function horizontalPlane(
  width: number,
  depth: number,
  segmentsW: number,
  segmentsH: number,
  material: Material,
  userData: Record<string, unknown>,
): Mesh {
  const geometry = new PlaneGeometry(width, depth, segmentsW, segmentsH);
  const position = geometry.getAttribute('position') as BufferAttribute;
  position.usage = DynamicDrawUsage;

  const restPlane = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    restPlane[i * 2] = position.getX(i);
    restPlane[i * 2 + 1] = position.getY(i);
  }
  const restAttr = new BufferAttribute(restPlane, 2);
  restAttr.usage = StaticDrawUsage;
  geometry.setAttribute(FABRIC_CLOTH_REST_PLANE_XY_ATTR, restAttr);

  const nu = segmentsW + 1;
  const nv = segmentsH + 1;
  const normalAttr = geometry.getAttribute('normal') as BufferAttribute;
  writeFabricClothGridNormalsFromPositions(
    position.array as Float32Array,
    normalAttr.array as Float32Array,
    nu,
    nv,
  );
  const mesh = new Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  Object.assign(mesh.userData, userData);
  return mesh;
}

export function buildFabricClothMeshFromOptions(
  options: BuildFabricClothMeshOptions,
): Mesh {
  const { faceWidth, faceHeight, material } = options;
  const { segmentsW, segmentsH } = resolveSegments(faceWidth, faceHeight, options);
  return horizontalPlane(faceWidth, faceHeight, segmentsW, segmentsH, material, {
    isAssetScreen: true,
    assetMeshRole: 'fabricCloth',
  });
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
