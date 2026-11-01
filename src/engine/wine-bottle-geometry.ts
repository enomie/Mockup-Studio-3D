import {
  DoubleSide,
  LatheGeometry,
  Mesh,
  type BufferGeometry,
  type Material,
  type Vector2,
} from 'three/webgpu';
import {
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
  loadWineBottlePartProfiles,
  sampleWineBottleRadiusAtY,
} from './wine-bottle-svg-profile';
import type { RotationalPrintBand } from './rotational-print-mapping';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';
const PART_LATHE_SEGMENTS = 64;
/** Former label offset; still widens the arc slightly so existing label widths stay put. */
const LABEL_RADIAL_STANDOFF_M = 0.001;

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
  imageWidth?: number;
  imageHeight?: number;
  /** Glass; carries the label print when an image is set. */
  glassMaterial: Material;
  corkMaterial: Material;
  foilMaterial: Material;
  discMaterial: Material;
  /** Override spike flag `WINE_BOTTLE_GLASS_INNER_MANTLE` for A/B. */
  innerMantle?: boolean;
}

export interface WineBottleMeshBuildResult {
  bodyMesh: Mesh;
  corkMesh: Mesh | null;
  foilMesh: Mesh | null;
  discMesh: Mesh | null;
}

/** Lathe of a capsule part from the SVG (foil / disc / cork), no stretch. */
function buildPartLatheGeometry(profile: Vector2[]): BufferGeometry {
  const geometry = new LatheGeometry(
    profile,
    PART_LATHE_SEGMENTS,
    LATHE_SEAM_PHI_START,
    FULL_LATHE_PHI_LENGTH,
  );
  geometry.computeVertexNormals();
  ensureGeometryTangents(geometry);
  return geometry;
}

function buildPartMesh(
  profile: Vector2[],
  material: Material,
  name: string,
  role: string,
  renderOrder: number,
  doubleSided: boolean,
): Mesh | null {
  if (profile.length < 2) {
    return null;
  }
  if (doubleSided) {
    material.side = DoubleSide;
  }
  const mesh = new Mesh(buildPartLatheGeometry(profile), material);
  mesh.name = name;
  mesh.userData.assetMeshRole = role;
  mesh.renderOrder = renderOrder;
  applyMeshPolygonOffset(mesh);
  return mesh;
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

/** Label band on the glass mantle (arc unless `labelWrap` is full); sized by image aspect. */
function wineBottlePrintBand(
  scaled: WineBottleParams,
  latheProfile: Vector2[],
  imageWidth?: number,
  imageHeight?: number,
): RotationalPrintBand {
  const { labelWidthM, labelHeightM } = computeWineBottleLabelPlane(
    scaled,
    imageWidth,
    imageHeight,
  );
  const y0 = scaled.labelBottomOffsetM;
  const { phiStart, phiLength } = mantlePhiRange(scaled, latheProfile, labelWidthM, labelHeightM);
  return { y0, y1: y0 + labelHeightM, phiStart, phiLength };
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
      printBand: wineBottlePrintBand(scaled, latheProfile, input.imageWidth, input.imageHeight),
    },
  );

  // Capsule parts: sizes and gaps come only from the SVG (path_green / path_blue / path_magenta).
  const parts = await loadWineBottlePartProfiles(bodyProfile, input.sizeScale);
  const corkMesh = isGeometryVisible(input.geometryVisibility, 'cork')
    ? buildPartMesh(parts.cork, input.corkMaterial, 'wine-bottle-cork', 'cork', 4, false)
    : null;
  const foilMesh = isGeometryVisible(input.geometryVisibility, 'capsuleFoil')
    ? buildPartMesh(parts.foil, input.foilMaterial, 'wine-bottle-capsule-foil', 'capsuleFoil', 5, true)
    : null;
  const discMesh = isGeometryVisible(input.geometryVisibility, 'capsuleDisc')
    ? buildPartMesh(parts.disc, input.discMaterial, 'wine-bottle-capsule-disc', 'capsuleDisc', 6, true)
    : null;

  return { bodyMesh, corkMesh, foilMesh, discMesh };
}
