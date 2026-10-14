import {
  LatheGeometry,
  Mesh,
  Vector2,
  type BufferAttribute,
  type BufferGeometry,
  type Material,
} from 'three/webgpu';
import {
  scaledBeverageCanParams,
  type BeverageCanParams,
} from '@/scene/asset-beverage-can';
import {
  isGeometryVisible,
  type AssetGeometryVisibility,
} from '@/scene/geometry-visibility';
import {
  loadNormalizedLatheProfile,
  sampleProfileRadiusAtY,
} from './beverage-can-svg-profile';
import { cylindricalLabelUv } from './cylindrical-label-uv';
import {
  applyLatheGeometryFootToY0,
  FULL_LATHE_PHI_LENGTH,
  LATHE_SEAM_PHI_START,
} from './lathe-asset-common';
import { buildOpenMantleGeometry } from './open-mantle-geometry';

const LATHE_SEGMENTS = 80;
const LABEL_MANTLE_RADIAL_SEGMENTS = 80;
const LABEL_MANTLE_HEIGHT_SEGMENTS = 24;
const MANTLE_RADIUS_TOLERANCE = 0.04;

export interface CanHullBuildOptions {
  params?: BeverageCanParams;
  /** When a label mesh covers the cylindrical band, drop those hull triangles to avoid z-fighting. */
  omitLabelBand?: boolean;
}

export interface BeverageCanMeshBuildInput {
  params: BeverageCanParams;
  sizeScale: number;
  geometryVisibility?: AssetGeometryVisibility;
  labelPrintVisible: boolean;
  /** Brushed aluminum — full hull + end ring (not image/print). */
  bodyMetalMaterial: Material;
  /** Brushed aluminum — top ring only (never label / print). */
  topRingMetalMaterial: Material;
  labelMaterial: Material;
}

export interface BeverageCanMeshBuildResult {
  bodyMesh: Mesh;
  labelMesh: Mesh | null;
  topRingMesh: Mesh;
}

export function labelBandYBounds(params: BeverageCanParams): {
  labelY0: number;
  labelY1: number;
} {
  return {
    labelY0: params.labelBottomOffsetM,
    labelY1: params.heightM - params.topRingHeightM,
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

function isCylindricalMantleTriangle(
  positions: Float32Array,
  ia: number,
  ib: number,
  ic: number,
  labelY0: number,
  labelY1: number,
  mantleProfile: Vector2[],
  bodRadiusM: number,
): boolean {
  const ay = positions[ia * 3 + 1];
  const by = positions[ib * 3 + 1];
  const cy = positions[ic * 3 + 1];
  const cyY = (ay + by + cy) / 3;
  if (cyY < labelY0 || cyY > labelY1) {
    return false;
  }

  const ax = positions[ia * 3];
  const az = positions[ia * 3 + 2];
  const bx = positions[ib * 3];
  const bz = positions[ib * 3 + 2];
  const cx = positions[ic * 3];
  const cz = positions[ic * 3 + 2];
  const ra = Math.hypot(ax, az);
  const rb = Math.hypot(bx, bz);
  const rc = Math.hypot(cx, cz);
  const rMean = (ra + rb + rc) / 3;

  let expectedR = sampleProfileRadiusAtY(mantleProfile, cyY);
  if (expectedR <= 0) {
    expectedR = bodRadiusM;
  }
  const tolerance = Math.max(expectedR * MANTLE_RADIUS_TOLERANCE, bodRadiusM * 0.01);
  return Math.abs(rMean - expectedR) <= tolerance;
}

function omitLabelBandFromHull(
  geometry: BufferGeometry,
  params: BeverageCanParams,
  mantleProfile: Vector2[],
): void {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const index = geometry.getIndex();
  if (!index) {
    return;
  }

  const positions = position.array as Float32Array;
  const { labelY0, labelY1 } = labelBandYBounds(params);
  const bodRadiusM = params.diameterM / 2;
  const kept: number[] = [];

  for (let i = 0; i < index.count; i += 3) {
    const ia = index.getX(i);
    const ib = index.getX(i + 1);
    const ic = index.getX(i + 2);
    if (
      isCylindricalMantleTriangle(
        positions,
        ia,
        ib,
        ic,
        labelY0,
        labelY1,
        mantleProfile,
        bodRadiusM,
      )
    ) {
      continue;
    }
    kept.push(ia, ib, ic);
  }

  geometry.setIndex(kept);
}

/** Lathe hull; label is a separate mantle mesh when an image is assigned. */
export function buildCanHullLatheGeometry(
  profilePoints: Vector2[],
  options: CanHullBuildOptions = {},
): BufferGeometry {
  const geometry = new LatheGeometry(profilePoints, LATHE_SEGMENTS, LATHE_SEAM_PHI_START);
  applyLatheGeometryFootToY0(geometry);
  if (options.omitLabelBand && options.params) {
    omitLabelBandFromHull(geometry, options.params, profilePoints);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function buildBeverageCanLabelMantleGeometry(
  mantleProfile: Vector2[],
  params: BeverageCanParams,
): BufferGeometry {
  const { labelY0, labelY1 } = labelBandYBounds(params);
  const bodFallback = params.diameterM / 2;

  return buildOpenMantleGeometry({
    y0: labelY0,
    y1: labelY1,
    sampleRadius: (y) => {
      const r = sampleProfileRadiusAtY(mantleProfile, y);
      return r > 0 ? r : bodFallback;
    },
    phiStart: LATHE_SEAM_PHI_START,
    phiLength: FULL_LATHE_PHI_LENGTH,
    radialSegments: LABEL_MANTLE_RADIAL_SEGMENTS,
    heightSegments: LABEL_MANTLE_HEIGHT_SEGMENTS,
    uvAt: (x, y, z) => cylindricalLabelUv(x, y, z, labelY0, labelY1),
  });
}

export function buildTopRingGeometry(
  mantleProfile: Vector2[],
  params: BeverageCanParams,
): BufferGeometry {
  const yBot = params.heightM - params.topRingHeightM;
  const yTop = params.heightM;

  let r0Bot = sampleProfileRadiusAtY(mantleProfile, yBot);
  let r0Top = sampleProfileRadiusAtY(mantleProfile, yTop);
  const bodFallback = params.diameterM / 2;
  if (r0Bot <= 0) {
    r0Bot = bodFallback;
  }
  if (r0Top <= 0) {
    r0Top = bodFallback;
  }

  const r1Bot = r0Bot + params.topRingThicknessM;
  const r1Top = r0Top + params.topRingThicknessM;

  const profile = [
    new Vector2(r0Bot, yBot),
    new Vector2(r1Bot, yBot),
    new Vector2(r1Top, yTop),
    new Vector2(r0Top, yTop),
    new Vector2(r0Bot, yBot),
  ];

  const geometry = new LatheGeometry(profile, LATHE_SEGMENTS, LATHE_SEAM_PHI_START);
  applyLatheGeometryFootToY0(geometry);
  geometry.computeVertexNormals();
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

  const labelPartVisible = isGeometryVisible(input.geometryVisibility, 'label');
  const showLabelPrint = labelPartVisible && input.labelPrintVisible;

  const bodyGeometry = buildCanHullLatheGeometry(profilePoints, {
    params: scaled,
    omitLabelBand: showLabelPrint,
  });
  const ringGeometry = buildTopRingGeometry(profilePoints, scaled);

  const bodyVisible = isGeometryVisible(input.geometryVisibility, 'body');
  const topRingVisible = isGeometryVisible(input.geometryVisibility, 'topRing');

  const bodyMesh = new Mesh(bodyGeometry, input.bodyMetalMaterial);
  bodyMesh.name = 'beverage-can-body';
  bodyMesh.userData.assetMeshRole = 'body';
  bodyMesh.visible = bodyVisible;

  let labelMesh: Mesh | null = null;
  if (showLabelPrint) {
    const labelGeometry = buildBeverageCanLabelMantleGeometry(profilePoints, scaled);
    labelMesh = new Mesh(labelGeometry, input.labelMaterial);
    labelMesh.name = 'beverage-can-label';
    labelMesh.userData.assetMeshRole = 'label';
    labelMesh.renderOrder = 2;
  }

  const topRingMesh = new Mesh(ringGeometry, input.topRingMetalMaterial);
  topRingMesh.name = 'beverage-can-top-ring';
  topRingMesh.userData.assetMeshRole = 'topRing';
  topRingMesh.position.y = scaled.heightM - scaled.topRingHeightM;
  topRingMesh.visible = topRingVisible;

  return { bodyMesh, labelMesh, topRingMesh };
}
