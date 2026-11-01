import type { FabricClothParams } from './asset-fabric-cloth';
import type { AssetMaterialSlots } from './material-types';

type UserBakedAssetSource = 'user';

type UserBakedFromKind = 'fabric-cloth';

type UserBakedPlacementKind = 'fabric-cloth-baked';

/** Serializable mesh payload for a baked fabric cloth (meters, plane-local before -X rotation). */
export interface FabricClothBakedMeshPayload {
  positions: number[];
  normals: number[];
  uvs: number[];
  restPlaneXY: number[];
  segmentsW: number;
  segmentsH: number;
  planeWidthM: number;
  planeHeightM: number;
}

interface FabricClothBakedDefaults {
  screenImageId: string | null;
  materials: AssetMaterialSlots;
  fabricClothParams: FabricClothParams;
}

export interface UserBakedAsset {
  id: string;
  source: UserBakedAssetSource;
  name: string;
  bakedFromKind: UserBakedFromKind;
  placementKind: UserBakedPlacementKind;
  defaults: FabricClothBakedDefaults;
  mesh: FabricClothBakedMeshPayload;
}

export interface FabricClothBakedMeshTopology {
  segmentsW: number;
  segmentsH: number;
  vertexCount: number;
  triangleCount: number;
}

export function fabricClothBakedMeshTopology(
  mesh: Pick<FabricClothBakedMeshPayload, 'segmentsW' | 'segmentsH'>,
): FabricClothBakedMeshTopology {
  const { segmentsW, segmentsH } = mesh;
  return {
    segmentsW,
    segmentsH,
    vertexCount: (segmentsW + 1) * (segmentsH + 1),
    triangleCount: 2 * segmentsW * segmentsH,
  };
}

function formatCompactTriangleCount(triangleCount: number): string {
  if (triangleCount >= 10_000) {
    const k = triangleCount / 1000;
    return `${Math.round(k)}k tris`;
  }
  if (triangleCount >= 1000) {
    const k = triangleCount / 1000;
    const rounded = Math.round(k * 10) / 10;
    const text = rounded.toFixed(1).replace(/\.0$/, '');
    return `${text}k tris`;
  }
  return `${triangleCount.toLocaleString('en-US')} tris`;
}

/** Short subtitle for Assets list rows. */
export function formatFabricClothBakedMeshSubtitle(
  mesh: Pick<FabricClothBakedMeshPayload, 'segmentsW' | 'segmentsH'>,
): string {
  const topology = fabricClothBakedMeshTopology(mesh);
  return `${topology.segmentsW}×${topology.segmentsH} · ${formatCompactTriangleCount(topology.triangleCount)}`;
}

export function formatFabricClothBakePhysicsHint(
  assetName: string,
  sourceSegmentsW: number,
  sourceSegmentsH: number,
  mesh: Pick<FabricClothBakedMeshPayload, 'segmentsW' | 'segmentsH'>,
): string {
  const topology = fabricClothBakedMeshTopology(mesh);
  return `${assetName}: sim ${sourceSegmentsW}×${sourceSegmentsH} → bake ${topology.segmentsW}×${topology.segmentsH} · ${topology.triangleCount.toLocaleString('en-US')} triangles`;
}

export function cloneFabricClothBakedMeshPayload(
  mesh: FabricClothBakedMeshPayload,
): FabricClothBakedMeshPayload {
  return {
    positions: [...mesh.positions],
    normals: [...mesh.normals],
    uvs: [...mesh.uvs],
    restPlaneXY: [...mesh.restPlaneXY],
    segmentsW: mesh.segmentsW,
    segmentsH: mesh.segmentsH,
    planeWidthM: mesh.planeWidthM,
    planeHeightM: mesh.planeHeightM,
  };
}

export type UserBakedAssetResolver = (id: string) => UserBakedAsset | null | undefined;

/** Engine output before the store assigns `id` / `name`. */
export interface BakeFabricClothDraft {
  defaults: FabricClothBakedDefaults;
  mesh: FabricClothBakedMeshPayload;
  sourceSegmentsW: number;
  sourceSegmentsH: number;
}
