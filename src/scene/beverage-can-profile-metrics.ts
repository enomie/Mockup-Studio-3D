import { builtinProfileFile } from '@/scene/builtin-profile-files';
import { LATHE_PROFILE_METRICS_MM } from '@/data/lathe-profile-metrics.generated';
import type { BeverageCanBodyProfile } from '@/engine/beverage-can-label-unfold';
import { latheSlotBounds } from '@/engine/lathe-svg-metrics';

/** Shipped profile SVG per body profile (public/profiles/lathe, 1 unit = 1 mm). */
export const BEVERAGE_CAN_SVG_FILE: Record<BeverageCanBodyProfile, string> = {
  standard: builtinProfileFile('can-330-classic'),
  sleek: builtinProfileFile('can-330-sleek'),
};

/** Sizes measured from the profile SVG (mm, at sizeScale = 1). */
export interface BeverageCanProfileMm {
  /** Overall height incl. top ring (foot → ring top). */
  heightMm: number;
  /** Body path height (`path_red`) — closed-can reference height for label briefs. */
  bodyHeightMm: number;
  /** Body outside diameter (2 × max radius of `path_red`). */
  bodyDiameterMm: number;
  /** Label band top = top ring underside, measured from the foot. */
  labelTopFromFootMm: number;
  /** SVG y of the foot (lowest point) — maps to lathe y = 0. */
  footYMm: number;
}

export function beverageCanProfileMm(profile: BeverageCanBodyProfile): BeverageCanProfileMm {
  const metrics = LATHE_PROFILE_METRICS_MM[BEVERAGE_CAN_SVG_FILE[profile]];
  const body = latheSlotBounds(metrics, 0);
  const ring = latheSlotBounds(metrics, 1);
  const footYMm = metrics.bounds.maxY;
  return {
    heightMm: footYMm - metrics.bounds.minY,
    bodyHeightMm: body.maxY - body.minY,
    bodyDiameterMm: body.maxX * 2,
    labelTopFromFootMm: footYMm - ring.maxY,
    footYMm,
  };
}
