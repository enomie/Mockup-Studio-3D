import {
  LatheGeometry,
  Mesh,
  BufferGeometry,
  type Material,
  type Vector2,
} from 'three/webgpu';
import {
  beverageCanLabelTopM,
  scaledBeverageCanParams,
  type BeverageCanParams,
} from '@/scene/asset-beverage-can';
import {
  isGeometryVisible,
  type AssetGeometryVisibility,
} from '@/scene/geometry-visibility';
import {
  loadBeverageCanLatheProfiles,
  sampleProfileRadiusAtY,
} from './beverage-can-svg-profile';
import { nominalForProfile } from './beverage-can-label-unfold';
import { applyRotationalPrintUv, PRINT_UV_ATTRIBUTE } from './rotational-print-mapping';
import {
  applyLatheGeometryFootToY0,
  LATHE_SEAM_PHI_START,
} from './lathe-asset-common';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

const LATHE_SEGMENTS = 80;
const MANTLE_RADIUS_TOLERANCE = 0.04;

export interface CanHullBuildOptions {
  /** Writes `printUv` on the cylindrical label band (other hull parts get outside UVs). */
  params?: BeverageCanParams;
}

export interface BeverageCanMeshBuildInput {
  params: BeverageCanParams;
  sizeScale: number;
  geometryVisibility?: AssetGeometryVisibility;
  /** Brushed aluminum hull; carries the label print when an image is set. */
  bodyMetalMaterial: Material;
  /** Brushed aluminum — top ring only (never label / print). */
  topRingMetalMaterial: Material;
}

export interface BeverageCanMeshBuildResult {
  bodyMesh: Mesh;
  topRingMesh: Mesh;
}

export function labelBandYBounds(params: BeverageCanParams): {
  labelY0: number;
  labelY1: number;
} {
  return {
    labelY0: params.labelBottomOffsetM,
    labelY1: beverageCanLabelTopM(params),
  };
}

/** Cover plane for label UV v and image aspect (meters). Unfold artwork may use taller brief height. */
export function beverageCanLabelCoverPlaneM(
  params: BeverageCanParams,
  sizeScale = 1,
): { planeW: number; planeH: number } {
  const scaled = scaledBeverageCanParams(params, sizeScale);
  const { labelY0, labelY1 } = labelBandYBounds(scaled);
  return {
    planeW: Math.PI * scaled.diameterM,
    planeH: labelY1 - labelY0,
  };
}

function isOnMantle(
  x: number,
  y: number,
  z: number,
  mantleProfile: Vector2[],
  bodRadiusM: number,
): boolean {
  let expectedR = sampleProfileRadiusAtY(mantleProfile, y);
  if (expectedR <= 0) {
    expectedR = bodRadiusM;
  }
  const tolerance = Math.max(expectedR * MANTLE_RADIUS_TOLERANCE, bodRadiusM * 0.01);
  return Math.abs(Math.hypot(x, z) - expectedR) <= tolerance;
}

/** Print UVs on the outer mantle; inner or off-profile vertices are marked outside. */
function applyHullPrintUv(
  geometry: BufferGeometry,
  params: BeverageCanParams,
  mantleProfile: Vector2[],
): void {
  const { labelY0, labelY1 } = labelBandYBounds(params);
  const bodRadiusM = params.diameterM / 2;
  applyRotationalPrintUv(geometry, { y0: labelY0, y1: labelY1 });
  const position = geometry.getAttribute('position');
  const printUv = geometry.getAttribute(PRINT_UV_ATTRIBUTE);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (!isOnMantle(x, y, z, mantleProfile, bodRadiusM)) {
      printUv.setXY(i, -1, -1);
    }
  }
}

/** Lathe hull; the label is printed into its material via `printUv`. */
export function buildCanHullLatheGeometry(
  profilePoints: Vector2[],
  options: CanHullBuildOptions = {},
): BufferGeometry {
  const geometry = new LatheGeometry(profilePoints, LATHE_SEGMENTS, LATHE_SEAM_PHI_START);
  applyLatheGeometryFootToY0(geometry);
  if (options.params) {
    applyHullPrintUv(geometry, options.params, profilePoints);
  }
  geometry.computeVertexNormals();
  ensureGeometryTangents(geometry);
  return geometry;
}

/** Top ring: lathe of the closed `path_green` contour (ring with a hole, not a disc). */
export function buildTopRingGeometry(ringProfile: Vector2[]): BufferGeometry {
  const geometry = new LatheGeometry(ringProfile, LATHE_SEGMENTS, LATHE_SEAM_PHI_START);
  geometry.computeVertexNormals();
  ensureGeometryTangents(geometry);
  return geometry;
}

export async function buildBeverageCanMeshes(
  input: BeverageCanMeshBuildInput,
): Promise<BeverageCanMeshBuildResult> {
  // Size always from the current profile: a user profile may have been edited since.
  const nominal = nominalForProfile(input.params.canBodyProfile);
  const params = { ...input.params, heightM: nominal.heightM, diameterM: nominal.diameterM };
  const scaled = scaledBeverageCanParams(params, input.sizeScale);
  const profile = scaled.canBodyProfile;

  const profiles = await loadBeverageCanLatheProfiles(profile, input.sizeScale);

  if (profiles.body.length < 2) {
    throw new Error(`Beverage can SVG profile empty: ${profile}`);
  }
  // The top ring is optional for user profiles; without it the mesh stays empty.
  const hasRing = profiles.ring.length >= 3;

  const bodyGeometry = buildCanHullLatheGeometry(profiles.body, { params: scaled });
  const ringGeometry = hasRing ? buildTopRingGeometry(profiles.ring) : new BufferGeometry();

  const bodyVisible = isGeometryVisible(input.geometryVisibility, 'body');
  const topRingVisible = isGeometryVisible(input.geometryVisibility, 'topRing');

  const bodyMesh = new Mesh(bodyGeometry, input.bodyMetalMaterial);
  bodyMesh.name = 'beverage-can-body';
  bodyMesh.userData.assetMeshRole = 'body';
  bodyMesh.visible = bodyVisible;

  const topRingMesh = new Mesh(ringGeometry, input.topRingMetalMaterial);
  topRingMesh.name = 'beverage-can-top-ring';
  topRingMesh.userData.assetMeshRole = 'topRing';
  topRingMesh.visible = topRingVisible && hasRing;

  return { bodyMesh, topRingMesh };
}
