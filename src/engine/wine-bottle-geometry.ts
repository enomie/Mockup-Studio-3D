import {
  CylinderGeometry,
  Mesh,
  type BufferGeometry,
  type Material,
  type Vector2,
} from 'three/webgpu';
import { buildOpenMantleGeometry } from './open-mantle-geometry';
import {
  CAPSULE_FOIL_STANDOFF_M,
  corkHeightM,
  corkRadiusMForProfile,
  resolvedLabelWidthHeight,
  scaledWineBottleParams,
  type WineBottleParams,
} from '@/scene/asset-wine-bottle';
import {
  isGeometryVisible,
  type AssetGeometryVisibility,
} from '@/scene/geometry-visibility';
import {
  buildWineBottleGlassMeshFromLatheProfile,
  prepareWineBottleGlassLatheProfile,
  trimLatheProfileToAscendingOuterMantle,
  WINE_BOTTLE_GLASS_INNER_MANTLE,
} from './wine-bottle-glass';
import {
  FULL_LATHE_PHI_LENGTH,
  LATHE_SEAM_PHI_START,
} from './lathe-asset-common';
import {
  loadWineBottleOpenWallProfile,
  sampleWineBottleRadiusAtY,
} from './wine-bottle-svg-profile';
const MANTLE_RADIAL_SEGMENTS = 64;
const LABEL_RADIAL_STANDOFF_M = 0.001;
const CAPSULE_RENDER_STANDOFF_M = 0.001;

function labelRadialStandoffM(wallThicknessM: number, sizeScale: number): number {
  return Math.max(LABEL_RADIAL_STANDOFF_M, wallThicknessM * 0.5 + 0.0001) * sizeScale;
}

function capsuleRadialStandoffM(sizeScale: number): number {
  return Math.max(CAPSULE_FOIL_STANDOFF_M, CAPSULE_RENDER_STANDOFF_M) * sizeScale;
}

function applyMeshPolygonOffset(mesh: Mesh): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    material.polygonOffset = true;
    material.polygonOffsetFactor = -2;
    material.polygonOffsetUnits = -2;
  }
}

export interface WineBottleMeshBuildInput {
  params: WineBottleParams;
  sizeScale: number;
  geometryVisibility?: AssetGeometryVisibility;
  labelPrintVisible: boolean;
  imageWidth?: number;
  imageHeight?: number;
  glassMaterial: Material;
  corkMaterial: Material;
  foilMaterial: Material;
  discMaterial: Material;
  labelMaterial: Material;
  /** Override spike flag `WINE_BOTTLE_GLASS_INNER_MANTLE` for A/B. */
  innerMantle?: boolean;
}

export interface WineBottleMeshBuildResult {
  bodyMesh: Mesh;
  labelMesh: Mesh | null;
  corkMesh: Mesh | null;
  foilMesh: Mesh | null;
  discMesh: Mesh | null;
}

function buildCorkCylinderGeometry(radiusM: number, heightM: number): BufferGeometry {
  const geometry = new CylinderGeometry(radiusM, radiusM, heightM, 32);
  geometry.translate(0, heightM * 0.5, 0);
  return geometry;
}

function mantlePhiRange(
  params: WineBottleParams,
  latheProfile: Vector2[],
  labelWidthM: number,
  labelHeightM: number,
): { phiStart: number; phiLength: number } {
  if (params.labelWrap === 'full') {
    return { phiStart: LATHE_SEAM_PHI_START, phiLength: FULL_LATHE_PHI_LENGTH };
  }

  const yMid = params.labelBottomOffsetM + labelHeightM * 0.5;
  const rMid = sampleWineBottleRadiusAtY(latheProfile, yMid) + LABEL_RADIAL_STANDOFF_M;
  const theta = rMid > 1e-6 ? labelWidthM / rMid : Math.PI;
  const phiLength = Math.min(Math.PI * 2, Math.max(0.05, theta));
  const phiStart = -phiLength * 0.5;
  return { phiStart, phiLength };
}

export function computeWineBottleLabelPlane(
  params: WineBottleParams,
  imageWidth?: number,
  imageHeight?: number,
): { planeW: number; planeH: number; labelWidthM: number; labelHeightM: number } {
  const aspect =
    imageWidth && imageHeight && imageWidth > 0 && imageHeight > 0
      ? imageWidth / imageHeight
      : 4 / 3;
  const { labelWidthM, labelHeightM } = resolvedLabelWidthHeight(params, aspect);
  return {
    planeW: labelWidthM,
    planeH: labelHeightM,
    labelWidthM,
    labelHeightM,
  };
}

export async function buildWineBottleMeshes(
  input: WineBottleMeshBuildInput,
): Promise<WineBottleMeshBuildResult> {
  const scaled = scaledWineBottleParams(input.params, input.sizeScale);
  const bodyProfile = scaled.wineBottleBodyProfile;

  const openWall = await loadWineBottleOpenWallProfile(bodyProfile, scaled.heightM);
  const latheProfile = trimLatheProfileToAscendingOuterMantle(
    prepareWineBottleGlassLatheProfile(openWall),
  );
  if (latheProfile.length < 2) {
    throw new Error(`Wine bottle SVG profile empty: ${bodyProfile}`);
  }

  const bodyVisible = isGeometryVisible(input.geometryVisibility, 'body');
  const bodyMesh = buildWineBottleGlassMeshFromLatheProfile(
    latheProfile,
    input.glassMaterial,
    bodyVisible,
    {
      wallThicknessM: scaled.wallThicknessM,
      innerMantle: input.innerMantle ?? WINE_BOTTLE_GLASS_INNER_MANTLE,
    },
  );

  const labelPartVisible = isGeometryVisible(input.geometryVisibility, 'label');
  const showLabel =
    labelPartVisible && input.labelPrintVisible && input.imageWidth && input.imageHeight;

  let labelMesh: Mesh | null = null;
  if (showLabel) {
    const { labelWidthM, labelHeightM } = computeWineBottleLabelPlane(
      scaled,
      input.imageWidth,
      input.imageHeight,
    );
    const y0 = scaled.labelBottomOffsetM;
    const y1 = y0 + labelHeightM;
    const { phiStart, phiLength } = mantlePhiRange(
      scaled,
      latheProfile,
      labelWidthM,
      labelHeightM,
    );
    const labelStandoff = labelRadialStandoffM(scaled.wallThicknessM, input.sizeScale);
    const labelGeometry = buildOpenMantleGeometry({
      y0,
      y1,
      sampleRadius: (y) => sampleWineBottleRadiusAtY(latheProfile, y) + labelStandoff,
      phiStart,
      phiLength,
      radialSegments: MANTLE_RADIAL_SEGMENTS,
      heightSegments: 24,
    });
    labelMesh = new Mesh(labelGeometry, input.labelMaterial);
    labelMesh.name = 'wine-bottle-label';
    labelMesh.userData.assetMeshRole = 'label';
    labelMesh.renderOrder = 3;
    applyMeshPolygonOffset(labelMesh);
  }

  let corkMesh: Mesh | null = null;
  if (isGeometryVisible(input.geometryVisibility, 'cork')) {
    const r = corkRadiusMForProfile(bodyProfile) * input.sizeScale;
    const h = corkHeightM() * input.sizeScale;
    const corkGeometry = buildCorkCylinderGeometry(r, h);
    corkMesh = new Mesh(corkGeometry, input.corkMaterial);
    corkMesh.name = 'wine-bottle-cork';
    corkMesh.userData.assetMeshRole = 'cork';
    corkMesh.position.y = scaled.heightM - h;
    corkMesh.renderOrder = 4;
    applyMeshPolygonOffset(corkMesh);
  }

  let foilMesh: Mesh | null = null;
  if (isGeometryVisible(input.geometryVisibility, 'capsuleFoil')) {
    const y1 = scaled.heightM;
    const y0 = y1 - scaled.capsuleFoilHeightM;
    const foilStandoff = capsuleRadialStandoffM(input.sizeScale);
    const foilGeometry = buildOpenMantleGeometry({
      y0,
      y1,
      sampleRadius: (y) => sampleWineBottleRadiusAtY(latheProfile, y) + foilStandoff,
      phiStart: LATHE_SEAM_PHI_START,
      phiLength: FULL_LATHE_PHI_LENGTH,
      radialSegments: MANTLE_RADIAL_SEGMENTS,
      heightSegments: 24,
    });
    foilMesh = new Mesh(foilGeometry, input.foilMaterial);
    foilMesh.name = 'wine-bottle-capsule-foil';
    foilMesh.userData.assetMeshRole = 'capsuleFoil';
    foilMesh.renderOrder = 5;
    applyMeshPolygonOffset(foilMesh);
  }

  let discMesh: Mesh | null = null;
  if (isGeometryVisible(input.geometryVisibility, 'capsuleDisc')) {
    const standoff = capsuleRadialStandoffM(input.sizeScale);
    const lipRadius = sampleWineBottleRadiusAtY(latheProfile, scaled.heightM) + standoff;
    const discH = scaled.capsuleDiscHeightM;
    const discGeometry = new CylinderGeometry(lipRadius, lipRadius, discH, 48);
    discGeometry.translate(0, discH * 0.5, 0);
    discMesh = new Mesh(discGeometry, input.discMaterial);
    discMesh.name = 'wine-bottle-capsule-disc';
    discMesh.userData.assetMeshRole = 'capsuleDisc';
    discMesh.position.y = scaled.heightM;
    discMesh.renderOrder = 6;
    applyMeshPolygonOffset(discMesh);
  }

  return { bodyMesh, labelMesh, corkMesh, foilMesh, discMesh };
}
