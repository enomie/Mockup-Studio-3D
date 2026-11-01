import {
  Box3,
  BoxGeometry,
  Group,
  LatheGeometry,
  Mesh,
  RingGeometry,
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
import {
  latheProfileBandBounds,
  type WheelCarLatheProfiles,
} from './wheel-car-svg-profile';

const LATHE_SEGMENTS = 48;
const RING_RADIAL_SEGMENTS = 48;
const SPOKE_HUB_BORE_MARGIN_M = 0.004;
const SPOKE_WIDTH_M = 0.018;
const SPOKE_DEPTH_M = 0.024;

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

type StirnEnd = 'minAxial' | 'maxAxial';

function buildWheelRimStirnCapGeometry(
  axialM: number,
  rInner: number,
  rOuter: number,
  end: StirnEnd,
): RingGeometry {
  const ring = new RingGeometry(rInner, rOuter, RING_RADIAL_SEGMENTS);
  ring.rotateX(end === 'maxAxial' ? -Math.PI / 2 : Math.PI / 2);
  ring.translate(0, axialM, 0);
  ring.computeVertexNormals();
  return ring;
}

function addRimStirnCaps(
  group: Group,
  points: Vector2[],
  material: Material,
  rolePrefix: string,
): void {
  if (points.length < 3) {
    return;
  }
  const bounds = latheProfileBandBounds(points);
  const rInner = Math.max(bounds.minRadiusM, 0.0005);
  const rOuter = bounds.maxRadiusM;
  if (rOuter <= rInner) {
    return;
  }

  for (const end of ['minAxial', 'maxAxial'] as const) {
    const axialM = end === 'minAxial' ? bounds.minAxialM : bounds.maxAxialM;
    const geometry = buildWheelRimStirnCapGeometry(axialM, rInner, rOuter, end);
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.assetMeshRole =
      end === 'minAxial' ? `${rolePrefix}StirnIn` : `${rolePrefix}StirnOut`;
    alignMeshAxisToWheelAxle(mesh);
    group.add(mesh);
  }
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

/** Procedural spokes on the +X face (YZ plane), axle along +X. */
function addWheelCarSpokes(
  group: Group,
  params: WheelCarParams,
  profiles: WheelCarLatheProfiles,
  rimMaterial: Material,
): void {
  const rimBounds = latheProfileBandBounds(profiles.rimOuter);
  const hubBounds = latheProfileBandBounds(profiles.rimInner);
  const rimBandMidAxial =
    (rimBounds.minAxialM + rimBounds.maxAxialM) * 0.5;
  const spokeFaceX = rimBandMidAxial - SPOKE_DEPTH_M * 0.5;
  const spokeOuterR = rimBounds.minRadiusM;
  const spokeInnerR = Math.max(
    hubBounds.minRadiusM,
    SPOKE_HUB_BORE_MARGIN_M,
  );
  const spokeLength = Math.max(spokeOuterR - spokeInnerR, 0.001);
  const spokeMidRadius = spokeInnerR + spokeLength * 0.5;

  const spokesGroup = new Group();
  spokesGroup.position.set(spokeFaceX, 0, 0);

  for (let i = 0; i < params.spokeCount; i += 1) {
    const angle = (i * 2 * Math.PI) / params.spokeCount;
    const spokeGeom = new BoxGeometry(SPOKE_DEPTH_M, spokeLength, SPOKE_WIDTH_M);
    const spoke = new Mesh(spokeGeom, rimMaterial);
    spoke.castShadow = true;
    spoke.receiveShadow = true;
    spoke.userData.assetMeshRole = 'wheelSpoke';
    spoke.position.set(
      0,
      Math.cos(angle) * spokeMidRadius,
      Math.sin(angle) * spokeMidRadius,
    );
    spoke.rotation.x = angle;
    spokesGroup.add(spoke);
  }
  group.add(spokesGroup);
}

/** Adds SVG lathe meshes + procedural spokes (foot pivot y = 0, axle +X). */
export function addWheelCarMeshesFromSvg(
  group: Group,
  profiles: WheelCarLatheProfiles,
  params: WheelCarParams,
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
  addRimStirnCaps(group, profiles.rimOuter, rimMaterial, 'wheelRimOuter');

  const rimInner = createLathePartMesh(profiles.rimInner, rimMaterial, 'wheelRimInner');
  if (rimInner) {
    group.add(rimInner);
  }
  addRimStirnCaps(group, profiles.rimInner, rimMaterial, 'wheelRimInner');

  addWheelCarSpokes(group, params, profiles, rimMaterial);
  applyFootPivotY0(group);
}
