import { STANDARD_GRAVITY_Y_MPS2 } from '@/physics/constants';
import { clamp } from '@/units/math';

export const STANDARD_GRAVITY_Y = STANDARD_GRAVITY_Y_MPS2;

/** Below this, rigid bodies never settle meaningfully — keep simulation alive. */
export const GRAVITY_SCALE_MIN = 0.01;
export const GRAVITY_SCALE_MAX = 2;
export const DEFAULT_GRAVITY_SCALE = 1;

export type PhysicsRigidTestPhase = 'idle' | 'running';

export type WorldPhysicsPhase = 'idle' | 'simulating' | 'paused';

/** UI-only feedback after fabric cloth bake — not persisted or synced from engine. */
interface FabricClothBakeSummary {
  assetName: string;
  sourceSegmentsW: number;
  sourceSegmentsH: number;
  bakedSegmentsW: number;
  bakedSegmentsH: number;
  triangleCount: number;
}

export interface PhysicsSettings {
  gravityScale: number;
  /** Mirror of engine rigid-test state — not user-patchable via setPhysicsSettings. */
  rigidTestPhase: PhysicsRigidTestPhase;
  /** World physics session — engine-owned. */
  worldPhysicsPhase: WorldPhysicsPhase;
  worldPhysicsHasSnapshot: boolean;
  /** Ephemeral — preserved across engine sync in the UI store. */
  lastFabricClothBakeSummary: FabricClothBakeSummary | null;
}

/** The physics settings the UI may change; the rest is engine-owned state. */
export type EditablePhysicsSettings = Pick<PhysicsSettings, 'gravityScale'>;

export function defaultPhysicsSettings(): PhysicsSettings {
  return {
    gravityScale: DEFAULT_GRAVITY_SCALE,
    rigidTestPhase: 'idle',
    worldPhysicsPhase: 'idle',
    worldPhysicsHasSnapshot: false,
    lastFabricClothBakeSummary: null,
  };
}

export function clonePhysicsSettings(settings: PhysicsSettings): PhysicsSettings {
  return { ...settings };
}

export function clampGravityScale(value: number): number {
  return clamp(value, GRAVITY_SCALE_MIN, GRAVITY_SCALE_MAX);
}

export function gravityVectorFromScale(scale: number): { x: number; y: number; z: number } {
  const clamped = clampGravityScale(scale);
  return { x: 0, y: STANDARD_GRAVITY_Y * clamped, z: 0 };
}

export function mergePhysicsSettings(
  base: PhysicsSettings,
  partial: Partial<PhysicsSettings>,
): PhysicsSettings {
  return {
    gravityScale: clampGravityScale(partial.gravityScale ?? base.gravityScale),
    rigidTestPhase: partial.rigidTestPhase ?? base.rigidTestPhase,
    worldPhysicsPhase: partial.worldPhysicsPhase ?? base.worldPhysicsPhase,
    worldPhysicsHasSnapshot:
      partial.worldPhysicsHasSnapshot ?? base.worldPhysicsHasSnapshot,
    lastFabricClothBakeSummary:
      partial.lastFabricClothBakeSummary !== undefined
        ? partial.lastFabricClothBakeSummary
        : base.lastFabricClothBakeSummary,
  };
}
