import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  FrontSide,
  LatheGeometry,
  Mesh,
  MeshDepthMaterial,
  RingGeometry,
  Vector2,
  type BufferGeometry,
  type Material,
} from 'three/webgpu';
import type { WineBottleBodyProfile } from '@/scene/asset-wine-bottle';
import {
  applyLatheGeometryFootToY0,
  LATHE_SEAM_PHI_START,
} from './lathe-asset-common';
import { weldLathePhiSeam } from './lathe-seam-normals';
import {
  loadWineBottleOpenWallProfile,
  resolveWineBottleStirnRadiiAtY,
  wineBottleLatheProfileBounds,
} from './wine-bottle-svg-profile';

export const WINE_BOTTLE_GLASS_LATHE_SEGMENTS = 64;
/**
 * Spike / A/B: second lathe mantle at `r − wallThicknessM`. Default off until visual sign-off.
 */
export const WINE_BOTTLE_GLASS_INNER_MANTLE = false;
const DEDUP_EPS_M = 1e-6;
const WALL_RADIUS_EPS_M = 1e-6;
/** Skip punt pole on inner lathe; foot closure stays on stirn ring. */
const INNER_MANTLE_MIN_RADIUS_M = 0.0015;

/**
 * Closed SVG wall loop → open polyline for LatheGeometry.
 * Drops duplicate closing vertex from path `Z` only (no other profile surgery).
 */
export function prepareWineBottleGlassLatheProfile(wall: Vector2[]): Vector2[] {
  if (wall.length < 2) {
    return [];
  }

  const profile: Vector2[] = [];
  for (const p of wall) {
    const pt = new Vector2(Math.max(0, p.x), p.y);
    if (profile.length === 0 || profile[profile.length - 1].distanceTo(pt) > DEDUP_EPS_M) {
      profile.push(pt);
    }
  }

  if (
    profile.length >= 2 &&
    profile[0].distanceTo(profile[profile.length - 1]) <= DEDUP_EPS_M
  ) {
    profile.pop();
  }

  return profile.length >= 2 ? profile : [];
}

/**
 * Open SVG paths close with Z and often trace back down the silhouette.
 * Lathe only the ascending outer leg (foot → lip); the descending leg would
 * create a self-overlapping sheet through the bottle interior.
 */
export function trimLatheProfileToAscendingOuterMantle(profile: Vector2[]): Vector2[] {
  if (profile.length < 2) {
    return profile;
  }

  let lipIndex = 0;
  let maxY = profile[0].y;
  for (let i = 1; i < profile.length; i += 1) {
    if (profile[i].y > maxY) {
      maxY = profile[i].y;
      lipIndex = i;
    }
  }

  const mantle = profile.slice(0, lipIndex + 1);
  return mantle.length >= 2 ? mantle : profile;
}

/**
 * Inner lathe profile for hollow glass shell.
 * Trims foot points where `r_outer − wall` would collapse the lathe pole (punt);
 * stirn ring still closes the bottom annulus.
 */
export function offsetLatheProfileForInnerMantle(
  outerProfile: Vector2[],
  wallThicknessM: number,
): Vector2[] {
  if (outerProfile.length < 2 || wallThicknessM <= 0) {
    return [];
  }

  const minOuterR = wallThicknessM + INNER_MANTLE_MIN_RADIUS_M;
  let start = 0;
  while (start < outerProfile.length && outerProfile[start].x < minOuterR) {
    start += 1;
  }
  if (start > outerProfile.length - 2) {
    return [];
  }

  const trimmed = outerProfile.slice(start);
  return trimmed.map(
    (p) => new Vector2(Math.max(WALL_RADIUS_EPS_M, p.x - wallThicknessM), p.y),
  );
}

export type WineBottleGlassStirnFacing = 'lip' | 'foot';

export function buildWineBottleGlassStirnRingGeometry(
  y: number,
  rInner: number,
  rOuter: number,
  radialSegments: number,
  facing: WineBottleGlassStirnFacing,
): RingGeometry {
  const ring = new RingGeometry(rInner, rOuter, radialSegments);
  ring.rotateX(facing === 'lip' ? -Math.PI / 2 : Math.PI / 2);
  ring.translate(0, y, 0);
  ring.computeVertexNormals();
  return ring;
}

function buildWineBottleGlassStirnGeometries(
  latheProfile: Vector2[],
  pivotDy: number,
  radialSegments: number,
  wallThicknessM: number,
): RingGeometry[] {
  const bounds = wineBottleLatheProfileBounds(latheProfile);
  const caps: RingGeometry[] = [];

  const footRadii = resolveWineBottleStirnRadiiAtY(
    latheProfile,
    bounds.minY,
    wallThicknessM,
  );
  if (footRadii) {
    caps.push(
      buildWineBottleGlassStirnRingGeometry(
        bounds.minY + pivotDy,
        footRadii.rInner,
        footRadii.rOuter,
        radialSegments,
        'foot',
      ),
    );
  }

  const lipRadii = resolveWineBottleStirnRadiiAtY(
    latheProfile,
    bounds.maxY,
    wallThicknessM,
  );
  if (lipRadii) {
    caps.push(
      buildWineBottleGlassStirnRingGeometry(
        bounds.maxY + pivotDy,
        lipRadii.rInner,
        lipRadii.rOuter,
        radialSegments,
        'lip',
      ),
    );
  }

  return caps;
}

export interface WineBottleGlassBuildOptions {
  wallThicknessM: number;
  /** When true, adds offset inner lathe mantle (defaults to `WINE_BOTTLE_GLASS_INNER_MANTLE`). */
  innerMantle?: boolean;
}

function buildOuterMantleLatheGeometry(latheProfile: Vector2[]): LatheGeometry {
  const mantle = new LatheGeometry(
    latheProfile,
    WINE_BOTTLE_GLASS_LATHE_SEGMENTS,
    LATHE_SEAM_PHI_START,
  );
  weldLathePhiSeam(mantle, WINE_BOTTLE_GLASS_LATHE_SEGMENTS, latheProfile.length);
  return mantle;
}

function buildInnerMantleLatheGeometry(
  latheProfile: Vector2[],
  wallThicknessM: number,
): LatheGeometry | null {
  const innerProfile = offsetLatheProfileForInnerMantle(latheProfile, wallThicknessM);
  if (innerProfile.length < 2) {
    return null;
  }
  const inner = new LatheGeometry(
    innerProfile,
    WINE_BOTTLE_GLASS_LATHE_SEGMENTS,
    LATHE_SEAM_PHI_START,
  );
  weldLathePhiSeam(inner, WINE_BOTTLE_GLASS_LATHE_SEGMENTS, innerProfile.length);
  inner.scale(-1, 1, 1);
  return inner;
}

function buildWineBottleGlassBodyGeometry(
  latheProfile: Vector2[],
  wallThicknessM: number,
  innerMantle: boolean,
): BufferGeometry {
  const bounds = wineBottleLatheProfileBounds(latheProfile);
  const pivotDy = -bounds.minY;

  const mantle = buildOuterMantleLatheGeometry(latheProfile);

  const stirnParts = buildWineBottleGlassStirnGeometries(
    latheProfile,
    pivotDy,
    WINE_BOTTLE_GLASS_LATHE_SEGMENTS,
    wallThicknessM,
  );

  const parts: BufferGeometry[] = [mantle];
  if (innerMantle) {
    const innerMantleGeometry = buildInnerMantleLatheGeometry(latheProfile, wallThicknessM);
    if (innerMantleGeometry) {
      parts.push(innerMantleGeometry);
    }
  }
  parts.push(...stirnParts);
  const merged = mergeGeometries(parts, false);
  for (const part of parts) {
    part.dispose();
  }
  applyLatheGeometryFootToY0(merged);
  merged.computeVertexNormals();
  return merged;
}

export function buildWineBottleGlassMeshFromLatheProfile(
  latheProfile: Vector2[],
  material: Material,
  visible = true,
  options: WineBottleGlassBuildOptions,
): Mesh {
  if (latheProfile.length < 2) {
    throw new Error('Wine bottle glass profile empty');
  }

  const useInnerMantle = options.innerMantle ?? WINE_BOTTLE_GLASS_INNER_MANTLE;
  const geometry = buildWineBottleGlassBodyGeometry(
    latheProfile,
    options.wallThicknessM,
    useInnerMantle,
  );

  const mesh = new Mesh(geometry, material);
  mesh.name = 'wine-bottle-glass';
  mesh.userData.assetMeshRole = 'body';
  mesh.visible = visible;

  const depth = new MeshDepthMaterial();
  depth.side = FrontSide;
  mesh.customDepthMaterial = depth;

  return mesh;
}

export function buildWineBottleGlassMeshFromWall(
  wall: Vector2[],
  material: Material,
  visible: boolean,
  options: WineBottleGlassBuildOptions,
): Mesh {
  const latheProfile = trimLatheProfileToAscendingOuterMantle(
    prepareWineBottleGlassLatheProfile(wall),
  );
  return buildWineBottleGlassMeshFromLatheProfile(latheProfile, material, visible, options);
}

export async function buildWineBottleGlassMesh(
  bodyProfile: WineBottleBodyProfile,
  heightM: number,
  material: Material,
  visible: boolean,
  options: WineBottleGlassBuildOptions,
): Promise<Mesh> {
  const wall = await loadWineBottleOpenWallProfile(bodyProfile, heightM);
  return buildWineBottleGlassMeshFromWall(wall, material, visible, options);
}
