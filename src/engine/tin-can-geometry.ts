import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  CircleGeometry,
  LatheGeometry,
  Mesh,
  Vector2,
  type BufferAttribute,
  type BufferGeometry,
  type Material,
} from 'three/webgpu';
import {
  isGeometryVisible,
  type AssetGeometryVisibility,
} from '@/scene/geometry-visibility';
import {
  endRingYBounds,
  labelBandYBounds,
  mantleYBounds,
  scaledTinCanParams,
  tinCanLidRadiusM,
  tinCanVerticalPivotOffsetM,
  type TinCanParams,
} from '@/scene/asset-tin-can';
import { cylindricalLabelUv } from './cylindrical-label-uv';
import { LATHE_SEAM_PHI_START } from './lathe-asset-common';
import { buildOpenMantleGeometry } from './open-mantle-geometry';

const MANTLE_RADIAL_SEGMENTS = 80;
const MANTLE_HEIGHT_SEGMENTS = 48;
const CAP_RADIAL_SEGMENTS = 64;

/** Bead depth relative to body radius at default size. */
const BEAD_AMPLITUDE_RATIO = 0.022;
/** Outward bias so label sits on top of hull (avoids z-fight on rippled mantle). */
export const TIN_CAN_LABEL_RADIAL_STANDOFF_M = 0.00008;

export function tinCanOuterRadiusAtY(y: number, params: TinCanParams): number {
  const R = params.bodyRadiusM;
  const { mantleY0, mantleY1 } = mantleYBounds(params);
  const mantleH = mantleY1 - mantleY0;
  if (mantleH <= 1e-9) {
    return R;
  }

  if (y < mantleY0 || y > mantleY1) {
    return R;
  }

  const t = (y - mantleY0) / mantleH;
  if (t < 0.1 || t > 0.9) {
    return R;
  }

  const beadY0 = mantleY0 + 0.1 * mantleH;
  const beadY1 = mantleY0 + 0.9 * mantleH;
  const beadZoneH = beadY1 - beadY0;
  const beadCount = params.beadCount;
  const amp = R * BEAD_AMPLITUDE_RATIO;
  const phase = (2 * Math.PI * beadCount * (y - beadY0)) / beadZoneH;
  // Inward-only ripples: R at crests, R − amp at troughs (never bulges past nominal OD).
  const inward = 0.5 * (1 - Math.cos(phase));
  return R - amp * inward;
}

function finalizeMantleGeometry(geometry: BufferGeometry): void {
  geometry.computeVertexNormals();
}

function buildSideMantleGeometry(
  params: TinCanParams,
  y0: number,
  y1: number,
  heightSegments: number,
  uvAt?: (x: number, y: number, z: number, phiT: number, heightT: number) => [number, number],
  radialStandoffM = 0,
): BufferGeometry {
  const geometry = buildOpenMantleGeometry({
    y0,
    y1,
    sampleRadius: (y) => tinCanOuterRadiusAtY(y, params) + radialStandoffM,
    phiStart: LATHE_SEAM_PHI_START,
    phiLength: Math.PI * 2,
    radialSegments: MANTLE_RADIAL_SEGMENTS,
    heightSegments,
    uvAt,
  });
  finalizeMantleGeometry(geometry);
  return geometry;
}

function buildEndRingGeometry(
  params: TinCanParams,
  placement: 'top' | 'bottom',
): BufferGeometry {
  const R = params.bodyRadiusM;
  const t = params.endRingThicknessM;
  const { y0, y1 } = endRingYBounds(params, placement);

  const profile = [
    new Vector2(R, y0),
    new Vector2(R + t, y0),
    new Vector2(R + t, y1),
    new Vector2(R, y1),
    new Vector2(R, y0),
  ];

  const geometry = new LatheGeometry(profile, MANTLE_RADIAL_SEGMENTS, LATHE_SEAM_PHI_START);
  geometry.computeVertexNormals();
  return geometry;
}

/** Unit normal +Y or -Y after placement (FrontSide metal). */
function buildDiskGeometry(
  radius: number,
  y: number,
  normal: 'positiveY' | 'negativeY',
): BufferGeometry {
  const geometry = new CircleGeometry(radius, CAP_RADIAL_SEGMENTS);
  geometry.rotateX(normal === 'positiveY' ? -Math.PI / 2 : Math.PI / 2);
  geometry.translate(0, y, 0);
  geometry.computeVertexNormals();
  return geometry;
}

/** Exterior + interior faces so the hollow shell is not visible through the lids. */
function buildSealedLidPair(
  params: TinCanParams,
  placement: 'top' | 'bottom',
): [BufferGeometry, BufferGeometry] {
  const lidR = tinCanLidRadiusM(params);
  const eps = Math.min(params.bodyHeightM * 1e-5, 0.00002);
  const { centerY } = endRingYBounds(params, placement);
  const half =
    placement === 'bottom'
      ? params.bottomEndRingHeightM * 0.5
      : params.topEndRingHeightM * 0.5;
  const y =
    placement === 'bottom' ? centerY + half : centerY - half;

  if (placement === 'bottom') {
    return [
      buildDiskGeometry(lidR, y, 'negativeY'),
      buildDiskGeometry(lidR, y + eps, 'positiveY'),
    ];
  }
  return [
    buildDiskGeometry(lidR, y, 'positiveY'),
    buildDiskGeometry(lidR, y - eps, 'negativeY'),
  ];
}

function omitLabelBandFromSideMantle(
  geometry: BufferGeometry,
  params: TinCanParams,
): void {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const index = geometry.getIndex();
  if (!index) {
    return;
  }

  const positions = position.array as Float32Array;
  const { labelY0, labelY1 } = labelBandYBounds(params);
  const kept: number[] = [];

  for (let i = 0; i < index.count; i += 3) {
    const ia = index.getX(i);
    const ib = index.getX(i + 1);
    const ic = index.getX(i + 2);
    const ay = positions[ia * 3 + 1];
    const by = positions[ib * 3 + 1];
    const cy = positions[ic * 3 + 1];
    const cyY = (ay + by + cy) / 3;
    if (cyY >= labelY0 && cyY <= labelY1) {
      continue;
    }
    kept.push(ia, ib, ic);
  }

  geometry.setIndex(kept);
}

function applyTinCanFootPivot(geometry: BufferGeometry, params: TinCanParams): void {
  const dy = tinCanVerticalPivotOffsetM(params);
  if (Math.abs(dy) > 1e-12) {
    geometry.translate(0, dy, 0);
  }
}

export function buildTinCanBodyGeometry(
  params: TinCanParams,
  omitLabelBand: boolean,
): BufferGeometry {
  const { mantleY0, mantleY1 } = mantleYBounds(params);
  const side = buildSideMantleGeometry(
    params,
    mantleY0,
    mantleY1,
    MANTLE_HEIGHT_SEGMENTS,
  );
  if (omitLabelBand) {
    omitLabelBandFromSideMantle(side, params);
  }

  const bottomRing = buildEndRingGeometry(params, 'bottom');
  const topRing = buildEndRingGeometry(params, 'top');
  const [bottomOuter, bottomInner] = buildSealedLidPair(params, 'bottom');
  const [topOuter, topInner] = buildSealedLidPair(params, 'top');

  const merged = mergeGeometries(
    [bottomRing, topRing, side, bottomOuter, bottomInner, topOuter, topInner],
    false,
  );
  if (!merged) {
    return side;
  }
  merged.computeVertexNormals();
  applyTinCanFootPivot(merged, params);
  bottomRing.dispose();
  topRing.dispose();
  bottomOuter.dispose();
  bottomInner.dispose();
  topOuter.dispose();
  topInner.dispose();
  side.dispose();
  return merged;
}

export function buildTinCanLabelMantleGeometry(
  params: TinCanParams,
  radialStandoffM = TIN_CAN_LABEL_RADIAL_STANDOFF_M,
): BufferGeometry {
  const { labelY0, labelY1 } = labelBandYBounds(params);
  const geometry = buildSideMantleGeometry(
    params,
    labelY0,
    labelY1,
    LABEL_MANTLE_HEIGHT_SEGMENTS,
    (x, y, z) => cylindricalLabelUv(x, y, z, labelY0, labelY1),
    radialStandoffM,
  );
  applyTinCanFootPivot(geometry, params);
  return geometry;
}

const LABEL_MANTLE_HEIGHT_SEGMENTS = 32;

export function tinCanLabelCoverPlaneM(
  params: TinCanParams,
  sizeScale = 1,
): { planeW: number; planeH: number } {
  const scaled = scaledTinCanParams(params, sizeScale);
  const { labelY0, labelY1 } = labelBandYBounds(scaled);
  return {
    planeW: 2 * Math.PI * scaled.bodyRadiusM,
    planeH: labelY1 - labelY0,
  };
}

export type TinCanMeshBuildInput = {
  params: TinCanParams;
  sizeScale: number;
  geometryVisibility?: AssetGeometryVisibility;
  labelPrintVisible: boolean;
  bodyMetalMaterial: Material;
  labelMaterial: Material;
};

export type TinCanMeshBuildResult = {
  bodyMesh: Mesh;
  labelMesh: Mesh | null;
};

export function buildTinCanMeshes(input: TinCanMeshBuildInput): TinCanMeshBuildResult {
  const scaled = scaledTinCanParams(input.params, input.sizeScale);

  const labelPartVisible = isGeometryVisible(input.geometryVisibility, 'label');
  const showLabelPrint = labelPartVisible && input.labelPrintVisible;

  const bodyGeometry = buildTinCanBodyGeometry(scaled, showLabelPrint);
  const bodyVisible = isGeometryVisible(input.geometryVisibility, 'body');

  const bodyMesh = new Mesh(bodyGeometry, input.bodyMetalMaterial);
  bodyMesh.name = 'tin-can-body';
  bodyMesh.userData.assetMeshRole = 'body';
  bodyMesh.visible = bodyVisible;

  let labelMesh: Mesh | null = null;
  if (showLabelPrint) {
    const labelGeometry = buildTinCanLabelMantleGeometry(
      scaled,
      TIN_CAN_LABEL_RADIAL_STANDOFF_M * input.sizeScale,
    );
    labelMesh = new Mesh(labelGeometry, input.labelMaterial);
    labelMesh.name = 'tin-can-label';
    labelMesh.userData.assetMeshRole = 'label';
    labelMesh.renderOrder = 2;
  }

  return { bodyMesh, labelMesh };
}
