import {
  LatheGeometry,
  Mesh,
  type BufferGeometry,
  type Material,
  type Vector2,
} from 'three/webgpu';
import type { PenParams } from '@/scene/asset-pen';
import {
  isGeometryVisible,
  type AssetGeometryVisibility,
} from '@/scene/geometry-visibility';
import { applyRotationalPrintUv } from './rotational-print-mapping';
import {
  FULL_LATHE_PHI_LENGTH,
  LATHE_SEAM_PHI_START,
} from './lathe-asset-common';
import { penBodyYBounds, penBodyWrapCoverPlaneM } from './pen-body-wrap-unfold';
import { loadPenLatheProfiles, type PenLatheProfiles } from './pen-svg-profile';
import { weldLathePhiSeam } from './lathe-seam-normals';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

const LATHE_SEGMENTS = 80;

function buildPenLatheGeometry(points: Vector2[]): BufferGeometry {
  const geometry = new LatheGeometry(
    points,
    LATHE_SEGMENTS,
    LATHE_SEAM_PHI_START,
    FULL_LATHE_PHI_LENGTH,
  );
  weldLathePhiSeam(geometry, LATHE_SEGMENTS, points.length);
  geometry.computeVertexNormals();
  ensureGeometryTangents(geometry);
  return geometry;
}

export interface PenMeshBuildInput {
  penParams: PenParams;
  sizeScale: number;
  geometryVisibility?: AssetGeometryVisibility;
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
  const profiles = await loadPenLatheProfiles(
    input.penParams.penBodyProfile,
    input.sizeScale,
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

  applyRotationalPrintUv(bodyGeometry, penBodyYBounds(profiles.body));

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
): { planeW: number; planeH: number } {
  return penBodyWrapCoverPlaneM(profiles.body);
}
