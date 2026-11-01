import {
  createDefaultFabricClothPhysicsParams as defaultPhysics,
  type FabricClothPhysicsParams,
} from '@/config/fabric-physics-presets';
import type { AssetKind } from './asset-kind';
import { MM_TO_M } from '@/units/length';
import { SHELL_HALF_THICKNESS } from '@/physics/cloth/contact-config';

;

export interface FabricClothVec3 {
  x: number;
  y: number;
  z: number;
}

interface FabricClothRestPoseParams {
  /** Local offset from entity origin (meters). */
  position: FabricClothVec3;
  /** Extra local Euler rotation (radians, XYZ) applied to the rest sim grid. */
  rotation: FabricClothVec3;
}

export interface FabricClothSimParams {
  /** Active corner pins: 0–4 (Silk corner order: TL, TR, BL, BR in grid UV). */
  pinnedCornersCount: number;
  /** Pin anchor positions in entity-local space (meters). */
  pinCorners: [FabricClothVec3, FabricClothVec3, FabricClothVec3, FabricClothVec3];
  restPose: FabricClothRestPoseParams;
}

export interface FabricClothParams {
  borderEnabled: boolean;
  borderWidthM: number;
  borderColor: string;
  /** Width / height while no image is assigned (an image's own ratio wins). */
  placeholderAspect: number;
  physics: FabricClothPhysicsParams;
  sim: FabricClothSimParams;
}

/** Partial updates that skip mesh rebuild (live Verlet tuning). */
export function isFabricRuntimeTuningPatch(partial: Partial<FabricClothParams>): boolean {
  const keys = Object.keys(partial);
  if (keys.length === 0) {
    return false;
  }
  for (const key of keys) {
    if (key !== 'physics' && key !== 'sim') {
      return false;
    }
  }
  return true;
}

export interface FabricClothFootprintM {
  widthM: number;
  heightM: number;
}

export const FABRIC_CLOTH_REF_WIDTH_M = 0.45;
export const FABRIC_CLOTH_PLACEHOLDER_ASPECT = 1;
const PLACEHOLDER_ASPECT_MIN = 0.05;
const PLACEHOLDER_ASPECT_MAX = 20;

function clampPlaceholderAspect(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.min(PLACEHOLDER_ASPECT_MAX, Math.max(PLACEHOLDER_ASPECT_MIN, value))
    : fallback;
}
export const FABRIC_CLOTH_BORDER_WIDTH_M = 0.002;
export const FABRIC_CLOTH_BORDER_WIDTH_MIN_M = 0.5 * MM_TO_M;
export const FABRIC_CLOTH_BORDER_WIDTH_MAX_M = 50 * MM_TO_M;
/** Roughness on inset border strip (solid trim look). */
export const FABRIC_CLOTH_BORDER_ROUGHNESS = 0.65;
/** Thin mesh extent for foot-pivot height (not visible thickness goal). */
export const FABRIC_CLOTH_MESH_THICKNESS_M = 0.001;

/** Frozen rest-plane coordinates (meters) for border TSL — not updated during physics sync. */
export const FABRIC_CLOTH_REST_PLANE_XY_ATTR = 'restPlaneXY';

const DEFAULT_BORDER_COLOR = '#3a3a3a';

const ZERO_VEC: FabricClothVec3 = { x: 0, y: 0, z: 0 };

const PHYSICS_GRAVITY_MIN = 1;
const PHYSICS_GRAVITY_MAX = 12;
const PHYSICS_DAMPING_MIN = 0.92;
const PHYSICS_DAMPING_MAX = 0.995;
const PHYSICS_BENDING_MIN = 0;
const PHYSICS_BENDING_MAX = 1;
const PHYSICS_FRICTION_MIN = 0.1;
const PHYSICS_FRICTION_MAX = 0.98;
const PHYSICS_SOLVER_ITERATIONS_MIN = 1;
const PHYSICS_SOLVER_ITERATIONS_MAX = 20;

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function clampVec3(
  partial: Partial<FabricClothVec3> | undefined,
  base: FabricClothVec3,
): FabricClothVec3 {
  return {
    x: clampNumber(partial?.x ?? base.x, -1000, 1000, base.x),
    y: clampNumber(partial?.y ?? base.y, -1000, 1000, base.y),
    z: clampNumber(partial?.z ?? base.z, -1000, 1000, base.z),
  };
}

function defaultRestPose(): FabricClothRestPoseParams {
  return {
    position: { ...ZERO_VEC },
    rotation: { ...ZERO_VEC },
  };
}

/** Centerline height proxy for default pin Y until Verlet shell is wired (Phase D). */
function defaultPinLocalY(restPose: FabricClothRestPoseParams): number {
  return restPose.position.y + SHELL_HALF_THICKNESS;
}

export function defaultFabricClothSimParams(
  footprint?: FabricClothFootprintM,
): FabricClothSimParams {
  const widthM = footprint?.widthM ?? FABRIC_CLOTH_REF_WIDTH_M;
  const heightM = footprint?.heightM ?? FABRIC_CLOTH_REF_WIDTH_M;
  const restPose = defaultRestPose();
  const pinY = defaultPinLocalY(restPose);
  const halfW = widthM * 0.5;
  const halfH = heightM * 0.5;
  const pinCorners: [FabricClothVec3, FabricClothVec3, FabricClothVec3, FabricClothVec3] = [
    { x: -halfW, y: pinY, z: -halfH },
    { x: halfW, y: pinY, z: -halfH },
    { x: -halfW, y: pinY, z: halfH },
    { x: halfW, y: pinY, z: halfH },
  ];
  return {
    pinnedCornersCount: 0,
    pinCorners,
    restPose,
  };
}

export function defaultFabricClothParams(
  footprint?: FabricClothFootprintM,
): FabricClothParams {
  return {
    borderEnabled: false,
    borderWidthM: FABRIC_CLOTH_BORDER_WIDTH_M,
    borderColor: DEFAULT_BORDER_COLOR,
    placeholderAspect: FABRIC_CLOTH_PLACEHOLDER_ASPECT,
    physics: defaultPhysics(),
    sim: defaultFabricClothSimParams(footprint),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readVec3(
  raw: unknown,
  fallback: FabricClothVec3,
): FabricClothVec3 {
  if (!isPlainObject(raw)) {
    return { ...fallback };
  }
  return clampVec3(
    {
      x: typeof raw.x === 'number' ? raw.x : undefined,
      y: typeof raw.y === 'number' ? raw.y : undefined,
      z: typeof raw.z === 'number' ? raw.z : undefined,
    },
    fallback,
  );
}

function readPhysics(raw: unknown): FabricClothPhysicsParams {
  const base = defaultPhysics();
  if (!isPlainObject(raw)) {
    return base;
  }
  const activeRaw = raw.activePreset;
  const activePreset =
    activeRaw === 'custom' ||
    activeRaw === 'silk' ||
    activeRaw === 'satin' ||
    activeRaw === 'linen' ||
    activeRaw === 'chiffon'
      ? activeRaw
      : base.activePreset;

  return {
    gravityMagnitude: clampNumber(
      typeof raw.gravityMagnitude === 'number' ? raw.gravityMagnitude : base.gravityMagnitude,
      PHYSICS_GRAVITY_MIN,
      PHYSICS_GRAVITY_MAX,
      base.gravityMagnitude,
    ),
    damping: clampNumber(
      typeof raw.damping === 'number' ? raw.damping : base.damping,
      PHYSICS_DAMPING_MIN,
      PHYSICS_DAMPING_MAX,
      base.damping,
    ),
    bendingStiffness: clampNumber(
      typeof raw.bendingStiffness === 'number' ? raw.bendingStiffness : base.bendingStiffness,
      PHYSICS_BENDING_MIN,
      PHYSICS_BENDING_MAX,
      base.bendingStiffness,
    ),
    friction: clampNumber(
      typeof raw.friction === 'number' ? raw.friction : base.friction,
      PHYSICS_FRICTION_MIN,
      PHYSICS_FRICTION_MAX,
      base.friction,
    ),
    solverIterations: Math.round(
      clampNumber(
        typeof raw.solverIterations === 'number' ? raw.solverIterations : base.solverIterations,
        PHYSICS_SOLVER_ITERATIONS_MIN,
        PHYSICS_SOLVER_ITERATIONS_MAX,
        base.solverIterations,
      ),
    ),
    activePreset,
  };
}

function readPinCorners(
  raw: unknown,
  fallback: FabricClothSimParams['pinCorners'],
): FabricClothSimParams['pinCorners'] {
  if (!Array.isArray(raw) || raw.length < 4) {
    return fallback.map((c) => ({ ...c })) as FabricClothSimParams['pinCorners'];
  }
  return [
    readVec3(raw[0], fallback[0]),
    readVec3(raw[1], fallback[1]),
    readVec3(raw[2], fallback[2]),
    readVec3(raw[3], fallback[3]),
  ];
}

function readSim(raw: unknown, footprint?: FabricClothFootprintM): FabricClothSimParams {
  const base = defaultFabricClothSimParams(footprint);
  if (!isPlainObject(raw)) {
    return base;
  }
  const restRaw = raw.restPose;
  const restPose: FabricClothRestPoseParams = isPlainObject(restRaw)
    ? {
        position: readVec3(restRaw.position, base.restPose.position),
        rotation: readVec3(restRaw.rotation, base.restPose.rotation),
      }
    : base.restPose;

  const pinnedCornersCount = Math.round(
    clampNumber(
      typeof raw.pinnedCornersCount === 'number' ? raw.pinnedCornersCount : base.pinnedCornersCount,
      0,
      4,
      base.pinnedCornersCount,
    ),
  );

  return {
    pinnedCornersCount,
    pinCorners: readPinCorners(raw.pinCorners, base.pinCorners),
    restPose,
  };
}

/** Load migration for saved scenes missing physics/sim nested fields. */
export function migrateFabricClothParams(
  raw: unknown,
  footprint?: FabricClothFootprintM,
): FabricClothParams {
  const base = defaultFabricClothParams(footprint);
  if (!isPlainObject(raw)) {
    return base;
  }
  const borderWidthM = clampBorderWidthM(
    typeof raw.borderWidthM === 'number' ? raw.borderWidthM : base.borderWidthM,
  );
  return {
    borderEnabled: typeof raw.borderEnabled === 'boolean' ? raw.borderEnabled : base.borderEnabled,
    borderWidthM,
    borderColor:
      typeof raw.borderColor === 'string' && raw.borderColor.length > 0
        ? raw.borderColor
        : base.borderColor,
    placeholderAspect: clampPlaceholderAspect(raw.placeholderAspect, base.placeholderAspect),
    physics: readPhysics(raw.physics),
    sim: readSim(raw.sim, footprint),
  };
}

export function isFabricClothAssetKind(kind: AssetKind): kind is 'fabric-cloth' {
  return kind === 'fabric-cloth';
}

export function isFabricClothBakedAssetKind(kind: AssetKind): kind is 'fabric-cloth-baked' {
  return kind === 'fabric-cloth-baked';
}

/** Simulatable flat cloth or stiff baked placement — shared image/material UI. */
export function isFabricClothFamilyAssetKind(
  kind: AssetKind,
): kind is 'fabric-cloth' | 'fabric-cloth-baked' {
  return isFabricClothAssetKind(kind) || isFabricClothBakedAssetKind(kind);
}

export function fabricClothFootprintFromSizes(
  widthM: number,
  heightM: number,
): FabricClothFootprintM {
  return { widthM, heightM };
}

function clampBorderWidthM(value: number): number {
  if (!Number.isFinite(value)) {return FABRIC_CLOTH_BORDER_WIDTH_M;}
  return Math.min(
    FABRIC_CLOTH_BORDER_WIDTH_MAX_M,
    Math.max(FABRIC_CLOTH_BORDER_WIDTH_MIN_M, value),
  );
}

function mergePhysicsPartial(
  partial: Partial<FabricClothPhysicsParams> | undefined,
  base: FabricClothPhysicsParams,
): FabricClothPhysicsParams {
  if (!partial) {
    return base;
  }
  const merged = {
    ...base,
    ...partial,
  };
  return readPhysics(merged);
}

function mergeSimPartial(
  partial: Partial<FabricClothSimParams> | undefined,
  base: FabricClothSimParams,
  footprint?: FabricClothFootprintM,
): FabricClothSimParams {
  if (!partial) {
    return base;
  }
  const restPose: FabricClothRestPoseParams = {
    position: clampVec3(partial.restPose?.position, base.restPose.position),
    rotation: clampVec3(partial.restPose?.rotation, base.restPose.rotation),
  };
  const pinCorners = partial.pinCorners
    ? readPinCorners(partial.pinCorners, base.pinCorners)
    : base.pinCorners;
  const pinnedCornersCount =
    partial.pinnedCornersCount !== undefined
      ? Math.round(
          clampNumber(partial.pinnedCornersCount, 0, 4, base.pinnedCornersCount),
        )
      : base.pinnedCornersCount;

  return readSim(
    {
      pinnedCornersCount,
      pinCorners,
      restPose,
    },
    footprint,
  );
}

export function clampFabricClothParams(
  partial: Partial<FabricClothParams>,
  base: FabricClothParams,
  footprint?: FabricClothFootprintM,
): FabricClothParams {
  const migratedBase = migrateFabricClothParams(base, footprint);
  const borderWidthM = clampBorderWidthM(
    partial.borderWidthM ?? migratedBase.borderWidthM,
  );
  return {
    borderEnabled: partial.borderEnabled ?? migratedBase.borderEnabled,
    borderWidthM,
    borderColor:
      typeof partial.borderColor === 'string' && partial.borderColor.length > 0
        ? partial.borderColor
        : migratedBase.borderColor,
    placeholderAspect: clampPlaceholderAspect(
      partial.placeholderAspect,
      migratedBase.placeholderAspect,
    ),
    physics: mergePhysicsPartial(partial.physics, migratedBase.physics),
    sim: mergeSimPartial(partial.sim, migratedBase.sim, footprint),
  };
}

export function cloneFabricClothParams(params: FabricClothParams): FabricClothParams {
  const migrated = migrateFabricClothParams(params);
  return {
    borderEnabled: migrated.borderEnabled,
    borderWidthM: migrated.borderWidthM,
    borderColor: migrated.borderColor,
    placeholderAspect: migrated.placeholderAspect,
    physics: { ...migrated.physics },
    sim: {
      pinnedCornersCount: migrated.sim.pinnedCornersCount,
      pinCorners: migrated.sim.pinCorners.map((c) => ({ ...c })) as FabricClothSimParams['pinCorners'],
      restPose: {
        position: { ...migrated.sim.restPose.position },
        rotation: { ...migrated.sim.restPose.rotation },
      },
    },
  };
}
