import {
  Box3,
  ExtrudeGeometry,
  type Group,
  LatheGeometry,
  Mesh,
  Shape,
  type BufferGeometry,
  type Material,
  type Vector2,
} from 'three/webgpu';
import type { WheelCarParams } from '@/scene/asset-wheel-car';
import {
  FULL_LATHE_PHI_LENGTH,
  LATHE_SEAM_PHI_START,
} from './lathe-asset-common';
import { weldLathePhiSeam } from './lathe-seam-normals';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';
import type { WheelCarLatheProfiles } from './wheel-car-svg-profile';

const LATHE_SEGMENTS = 48;
/** Tangential spoke width at sizeScale = 1 (the SVG holds the side view only). */
const SPOKE_WIDTH_M = 0.018;

/** Align default Y-up lathe width with wheel axle +X. */
const AXLE_ROTATION_Z = Math.PI / 2;

export function buildWheelCarLatheGeometry(points: Vector2[]): BufferGeometry {
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

function alignMeshAxisToWheelAxle(mesh: Mesh): void {
  mesh.rotation.z = AXLE_ROTATION_Z;
}

function createLathePartMesh(
  points: Vector2[],
  material: Material,
  role: string,
): Mesh | null {
  if (points.length < 3) {
    return null;
  }
  const geometry = buildWheelCarLatheGeometry(points);
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.assetMeshRole = role;
  alignMeshAxisToWheelAxle(mesh);
  return mesh;
}

function applyFootPivotY0(group: Group): void {
  const box = new Box3().setFromObject(group);
  const dy = -box.min.y;
  if (Math.abs(dy) < 1e-9) {
    return;
  }
  for (const child of group.children) {
    child.position.y += dy;
  }
}

/** Spoke: side view from the SVG (radius × axial) extruded tangentially, repeated around the axle. */
function buildWheelCarSpokeGeometry(
  spokeProfile: Vector2[],
  widthM: number,
  angle: number,
): BufferGeometry {
  const geometry = new ExtrudeGeometry(new Shape(spokeProfile), {
    depth: widthM,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -widthM / 2);
  geometry.rotateY(angle);
  geometry.computeVertexNormals();
  ensureGeometryTangents(geometry);
  return geometry;
}

function addWheelCarSpokes(
  group: Group,
  params: WheelCarParams,
  spokeProfile: Vector2[],
  sizeScale: number,
  rimMaterial: Material,
): void {
  if (spokeProfile.length < 3) {
    return;
  }
  for (let i = 0; i < params.spokeCount; i += 1) {
    const angle = (i * 2 * Math.PI) / params.spokeCount;
    const spoke = new Mesh(
      buildWheelCarSpokeGeometry(spokeProfile, SPOKE_WIDTH_M * sizeScale, angle),
      rimMaterial,
    );
    spoke.castShadow = true;
    spoke.receiveShadow = true;
    spoke.userData.assetMeshRole = 'wheelSpoke';
    alignMeshAxisToWheelAxle(spoke);
    group.add(spoke);
  }
}

/** Adds SVG lathe meshes + extruded SVG spokes (foot pivot y = 0, axle +X). */
export function addWheelCarMeshesFromSvg(
  group: Group,
  profiles: WheelCarLatheProfiles,
  params: WheelCarParams,
  sizeScale: number,
  tireMaterial: Material,
  rimMaterial: Material,
): void {
  const tire = createLathePartMesh(profiles.tire, tireMaterial, 'wheelTire');
  if (tire) {
    group.add(tire);
  }

  const rimOuter = createLathePartMesh(profiles.rimOuter, rimMaterial, 'wheelRimOuter');
  if (rimOuter) {
    group.add(rimOuter);
  }

  const rimInner = createLathePartMesh(profiles.rimInner, rimMaterial, 'wheelRimInner');
  if (rimInner) {
    group.add(rimInner);
  }

  addWheelCarSpokes(group, params, profiles.spoke, sizeScale, rimMaterial);
  applyFootPivotY0(group);
}
