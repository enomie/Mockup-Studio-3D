import type { BeverageCanBodyProfile } from '@/engine/beverage-can-label-unfold';
import type { LatheBoundsMm } from '@/engine/lathe-svg-metrics';
import {
  registeredProfileMetrics,
  resolveAssetProfile,
  type ResolvedAssetProfile,
} from '@/scene/profile-registry';

export const DEFAULT_BEVERAGE_CAN_PROFILE_ID = 'can-330-classic';
/** Can parts by profile slot: 0 body (required), 1 top ring (optional). */
const CAN_BODY_SLOT = 0;
const CAN_RING_SLOT = 1;

/** The profile a can uses; falls back to the classic can when missing or without a body path. */
export function resolveBeverageCanProfile(profile: BeverageCanBodyProfile): ResolvedAssetProfile {
  return resolveAssetProfile(profile, [CAN_BODY_SLOT], DEFAULT_BEVERAGE_CAN_PROFILE_ID);
}

/** Sizes measured from the profile (mm, at sizeScale = 1). */
export interface BeverageCanProfileMm {
  /** Overall height incl. top ring (foot → ring top). */
  heightMm: number;
  /** Body path height (`path_red`) — closed-can reference height for label briefs. */
  bodyHeightMm: number;
  /** Body outside diameter (2 × max radius of `path_red`). */
  bodyDiameterMm: number;
  /** Label band top = top ring underside (or body top without ring), measured from the foot. */
  labelTopFromFootMm: number;
  /** SVG y of the foot (lowest point) — maps to lathe y = 0. */
  footYMm: number;
}

export function beverageCanProfileMm(profile: BeverageCanBodyProfile): BeverageCanProfileMm {
  const metrics = registeredProfileMetrics(resolveBeverageCanProfile(profile).entry);
  const body: LatheBoundsMm | null | undefined = metrics?.slots[CAN_BODY_SLOT];
  if (!metrics || !body) {throw new Error('Beverage can profile has no body path');}
  const ring = metrics.slots[CAN_RING_SLOT] ?? null;
  const footYMm = metrics.bounds.maxY;
  return {
    heightMm: footYMm - metrics.bounds.minY,
    bodyHeightMm: body.maxY - body.minY,
    bodyDiameterMm: body.maxX * 2,
    labelTopFromFootMm: footYMm - (ring ? ring.maxY : body.minY),
    footYMm,
  };
}
