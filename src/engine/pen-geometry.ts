import {
  BufferAttribute,
  LatheGeometry,
  Mesh,
  type BufferGeometry,
  type Material,
  type Vector2,
} from 'three/webgpu';
import { scaledPenMaxRadiusM, type PenParams } from '@/scene/asset-pen';
import {
  isGeometryVisible,
  type AssetGeometryVisibility,
} from '@/scene/geometry-visibility';
import { cylindricalLabelUv } from './cylindrical-label-uv';
import {
  FULL_LATHE_PHI_LENGTH,
  LATHE_SEAM_PHI_START,
} from './lathe-asset-common';
import { penBodyYBounds, penBodyWrapCoverPlaneM } from './pen-body-wrap-unfold';
import { loadPenLatheProfiles, type PenLatheProfiles } from './pen-svg-profile';
import { weldLathePhiSeam } from './lathe-seam-normals';

const LATHE_SEGMENTS = 80;

export function buildPenLatheGeometry(points: Vector2[]): BufferGeometry {
  const geometry = new LatheGeometry(
    points,
    LATHE_SEGMENTS,
    LATHE_SEAM_PHI_START,
    FULL_LATHE_PHI_LENGTH,
  );
  weldLathePhiSeam(geometry, LATHE_SEGMENTS, points.length);
  geometry.computeVertexNormals();
  return geometry;
}

function applyCylindricalUvToGeometry(
  geometry: BufferGeometry,
  y0: number,
  y1: number,
): void {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const uvs = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const [u, v] = cylindricalLabelUv(x, y, z, y0, y1);
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
}

export interface PenMeshBuildInput {
  penParams: PenParams;
  sizeScale: number;
  geometryVisibility?: AssetGeometryVisibility;
  bodyPrintVisible: boolean;
  imageWidth?: number;
  imageHeight?: number;
  capMaterial: Material;
  ringMaterial: Material;
  bodyMaterial: Material;
}

export interface PenMeshBuildResult {
  capMesh: Mesh;
  ringMesh: Mesh;
  bodyMesh: Mesh;
}

export async function buildPenMeshes(
  input: PenMeshBuildInput,
): Promise<PenMeshBuildResult> {
  const maxRadiusM = scaledPenMaxRadiusM(
    input.penParams.maxRadiusM,
    input.sizeScale,
  );
  const profiles = await loadPenLatheProfiles(
    input.penParams.penBodyProfile,
    maxRadiusM,
  );

  if (profiles.body.length < 2) {
    throw new Error(`Pen body SVG profile empty: ${input.penParams.penBodyProfile}`);
  }

  const capVisible = isGeometryVisible(input.geometryVisibility, 'cap');
  const ringVisible = isGeometryVisible(input.geometryVisibility, 'ring');
  const bodyVisible = isGeometryVisible(input.geometryVisibility, 'penBody');

  const capGeometry = buildPenLatheGeometry(profiles.cap);
  const ringGeometry = buildPenLatheGeometry(profiles.ring);
  const bodyGeometry = buildPenLatheGeometry(profiles.body);

  const { y0, y1 } = penBodyYBounds(profiles.body);
  if (input.bodyPrintVisible) {
    applyCylindricalUvToGeometry(bodyGeometry, y0, y1);
  }

  const capMesh = new Mesh(capGeometry, input.capMaterial);
  capMesh.name = 'pen-cap';
  capMesh.userData.assetMeshRole = 'cap';
  capMesh.visible = capVisible && profiles.cap.length >= 2;

  const ringMesh = new Mesh(ringGeometry, input.ringMaterial);
  ringMesh.name = 'pen-ring';
  ringMesh.userData.assetMeshRole = 'ring';
  ringMesh.visible = ringVisible && profiles.ring.length >= 2;

  const bodyMesh = new Mesh(bodyGeometry, input.bodyMaterial);
  bodyMesh.name = 'pen-body';
  bodyMesh.userData.assetMeshRole = 'penBody';
  bodyMesh.visible = bodyVisible;

  return { capMesh, ringMesh, bodyMesh };
}

export function penBodyCoverPlaneFromProfiles(
  profiles: PenLatheProfiles,
  _penParams: PenParams,
  _sizeScale: number,
): { planeW: number; planeH: number } {
  return penBodyWrapCoverPlaneM(profiles.body, 0, 1);
}
