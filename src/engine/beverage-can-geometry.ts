import {
  LatheGeometry,
  Mesh,
  Vector2,
  type BufferGeometry,
  type Material,
} from 'three/webgpu';
import {
  beverageCanTopRingYBounds,
  scaledBeverageCanParams,
  type BeverageCanParams,
} from '@/scene/asset-beverage-can';
import { MM_TO_M } from '@/units/length';
import {
  isGeometryVisible,
  type AssetGeometryVisibility,
} from '@/scene/geometry-visibility';
import {
  loadNormalizedLatheProfile,
  sampleProfileRadiusAtY,
} from './beverage-can-svg-profile';
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
  const topHalf = params.topRingHeightM * 0.5;
  return {
    labelY0: params.labelBottomOffsetM,
    labelY1: params.heightM - topHalf,
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

/** Axisymmetric lip: lathe a radial×vertical rectangle; `topRingCenterRadiusMm` is the ring mid-radius. */
export function buildTopRingGeometry(params: BeverageCanParams): BufferGeometry {
  const { y0, y1 } = beverageCanTopRingYBounds(params);
  const centerM = params.topRingCenterRadiusMm * MM_TO_M;
  const halfThicknessM = params.topRingThicknessM * 0.5;
  const rInnerM = Math.max(centerM - halfThicknessM, 1e-6);
  const rOuterM = centerM + halfThicknessM;

  const profile = [
    new Vector2(rInnerM, y0),
    new Vector2(rOuterM, y0),
    new Vector2(rOuterM, y1),
    new Vector2(rInnerM, y1),
    new Vector2(rInnerM, y0),
  ];

  const geometry = new LatheGeometry(profile, LATHE_SEGMENTS, LATHE_SEAM_PHI_START);
  applyLatheGeometryFootToY0(geometry);
  geometry.computeVertexNormals();
  ensureGeometryTangents(geometry);
  return geometry;
}

export async function buildBeverageCanMeshes(
  input: BeverageCanMeshBuildInput,
): Promise<BeverageCanMeshBuildResult> {
  const scaled = scaledBeverageCanParams(input.params, input.sizeScale);
  const profile = scaled.canBodyProfile;

  const profilePoints = await loadNormalizedLatheProfile(
    profile,
    scaled.heightM,
    scaled.diameterM,
  );

  if (profilePoints.length < 2) {
    throw new Error(`Beverage can SVG profile empty: ${profile}`);
  }

  const bodyGeometry = buildCanHullLatheGeometry(profilePoints, { params: scaled });
  const ringGeometry = buildTopRingGeometry(scaled);

  const bodyVisible = isGeometryVisible(input.geometryVisibility, 'body');
  const topRingVisible = isGeometryVisible(input.geometryVisibility, 'topRing');

  const bodyMesh = new Mesh(bodyGeometry, input.bodyMetalMaterial);
  bodyMesh.name = 'beverage-can-body';
  bodyMesh.userData.assetMeshRole = 'body';
  bodyMesh.visible = bodyVisible;

  const topRingMesh = new Mesh(ringGeometry, input.topRingMetalMaterial);
  topRingMesh.name = 'beverage-can-top-ring';
  topRingMesh.userData.assetMeshRole = 'topRing';
  topRingMesh.position.y = beverageCanTopRingYBounds(scaled).y0;
  topRingMesh.visible = topRingVisible;

  return { bodyMesh, topRingMesh };
}
