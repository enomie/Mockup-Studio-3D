/**
 * Label sleeve unfold (flat artwork) for beverage cans.
 * Internal reference for geometry/UV — not exposed in the app UI.
 * Spec: requirements-assets-beverage-can.md
 */

export type BeverageCanBodyProfile = 'standard' | 'sleek';

/** Shared metal zones (both 330 ml profiles) — mm */
export const BEVERAGE_CAN_LABEL_METAL_ZONES_MM = {
  bottomMetalBandMm: 5,
  topRingHeightMm: 2.5,
} as const;

/** Bottom band only — top 2.5 mm is separate `topRing` mesh, not subtracted from unfold height. */
const BEVERAGE_CAN_LABEL_BOTTOM_METAL_MM =
  BEVERAGE_CAN_LABEL_METAL_ZONES_MM.bottomMetalBandMm;

/** Nominal mockup dimensions at sizeScale = 1 (meters). See requirements-assets-beverage-can.md */
export interface BeverageCanNominalM {
  heightM: number;
  diameterM: number;
  labelHeightM: number;
  labelBottomOffsetM: number;
}

interface BeverageCanBodyNominalMm {
  canHeightMm: number;
  bodyDiameterMm: number;
}

export interface LabelUnfoldMm {
  /** One full wrap: π × body outside diameter */
  widthMm: number;
  /** Printable label band height */
  heightMm: number;
  circumferenceMm: number;
  bodyDiameterMm: number;
}

export interface LabelUnfoldAspect {
  widthOverHeight: number;
  heightOverWidth: number;
}

export interface LabelUnfoldPixels {
  dpi: number;
  widthPx: number;
  heightPx: number;
}

const MM_PER_M = 1000;

/** Closed-can height + BOD (mm). Label band derived via metal zones. */
const BEVERAGE_CAN_BODY_NOMINAL_MM: Record<BeverageCanBodyProfile, BeverageCanBodyNominalMm> = {
  standard: {
    canHeightMm: 115.2,
    bodyDiameterMm: 66,
  },
  sleek: {
    canHeightMm: 146.05,
    // 57.4 mm as exact tenths — avoids binary float of literal 57.4
    bodyDiameterMm: 574 / 10,
  },
};

export function computeLabelBandHeightMm(canHeightMm: number): number {
  return canHeightMm - BEVERAGE_CAN_LABEL_BOTTOM_METAL_MM;
}

function computeLabelUnfoldMm(bodyDiameterMm: number, labelHeightMm: number): LabelUnfoldMm {
  const circumferenceMm = Math.PI * bodyDiameterMm;
  return {
    widthMm: circumferenceMm,
    heightMm: labelHeightMm,
    circumferenceMm,
    bodyDiameterMm,
  };
}

export function computeLabelUnfoldForProfile(profile: BeverageCanBodyProfile): LabelUnfoldMm {
  const body = BEVERAGE_CAN_BODY_NOMINAL_MM[profile];
  const labelHeightMm = computeLabelBandHeightMm(body.canHeightMm);
  return computeLabelUnfoldMm(body.bodyDiameterMm, labelHeightMm);
}

/** Viewport / UV: mantle band between bottom metal and top ring (not artwork brief height). */
export function computeLabelPrintableBandHeightMm(canHeightMm: number): number {
  return (
    canHeightMm -
    BEVERAGE_CAN_LABEL_METAL_ZONES_MM.bottomMetalBandMm -
    BEVERAGE_CAN_LABEL_METAL_ZONES_MM.topRingHeightMm
  );
}

export function computeLabelPrintableBandMm(profile: BeverageCanBodyProfile): LabelUnfoldMm {
  const body = BEVERAGE_CAN_BODY_NOMINAL_MM[profile];
  const heightMm = computeLabelPrintableBandHeightMm(body.canHeightMm);
  return computeLabelUnfoldMm(body.bodyDiameterMm, heightMm);
}

/** Image aspect vs printable band (meters). Used for height-fit label mapping. */
export function imageMatchesPrintableBandAspect(
  imageWidthPx: number,
  imageHeightPx: number,
  planeW: number,
  planeH: number,
  tolerance = 1e-3,
): boolean {
  if (imageWidthPx <= 0 || imageHeightPx <= 0 || planeW <= 0 || planeH <= 0) {
    return false;
  }
  const target = planeW / planeH;
  const actual = imageWidthPx / imageHeightPx;
  return Math.abs(actual - target) <= tolerance * target;
}

/** Horizontal span of image on band UV u (1 = full wrap). */
export function labelImageUSpan(
  planeW: number,
  planeH: number,
  imageW: number,
  imageH: number,
): number {
  if (planeW <= 0 || planeH <= 0 || imageW <= 0 || imageH <= 0) {
    return 1;
  }
  const planeAspect = planeW / planeH;
  const imageAspect = imageW / imageH;
  return imageAspect / planeAspect;
}

/** Map band u ∈ [0,1] to texture s (height-fit rules). */
export function bandUToTextureS(bandU: number, uSpan: number): number {
  if (uSpan >= 1) {
    return (bandU - 0.5) * uSpan + 0.5;
  }
  return (bandU - 0.5) / uSpan + 0.5;
}

function nominalMmToM(
  body: BeverageCanBodyNominalMm,
  labelHeightMm: number,
): BeverageCanNominalM {
  return {
    heightM: body.canHeightMm / MM_PER_M,
    diameterM: body.bodyDiameterMm / MM_PER_M,
    labelHeightM: labelHeightMm / MM_PER_M,
    labelBottomOffsetM: BEVERAGE_CAN_LABEL_METAL_ZONES_MM.bottomMetalBandMm / MM_PER_M,
  };
}

const BEVERAGE_CAN_NOMINAL_BY_PROFILE: Record<BeverageCanBodyProfile, BeverageCanNominalM> = {
  standard: nominalMmToM(
    BEVERAGE_CAN_BODY_NOMINAL_MM.standard,
    computeLabelBandHeightMm(BEVERAGE_CAN_BODY_NOMINAL_MM.standard.canHeightMm),
  ),
  sleek: nominalMmToM(
    BEVERAGE_CAN_BODY_NOMINAL_MM.sleek,
    computeLabelBandHeightMm(BEVERAGE_CAN_BODY_NOMINAL_MM.sleek.canHeightMm),
  ),
};

export function nominalForProfile(profile: BeverageCanBodyProfile): BeverageCanNominalM {
  return BEVERAGE_CAN_NOMINAL_BY_PROFILE[profile];
}

export function computeLabelUnfoldAspect(unfold: LabelUnfoldMm): LabelUnfoldAspect {
  const widthOverHeight = unfold.widthMm / unfold.heightMm;
  return {
    widthOverHeight,
    heightOverWidth: 1 / widthOverHeight,
  };
}

/** Pixel size for flat label artwork at a print/design DPI (mm → inch via 25.4). */
function computeLabelUnfoldPixels(unfold: LabelUnfoldMm, dpi: number): LabelUnfoldPixels {
  if (dpi <= 0) {
    throw new RangeError('dpi must be positive');
  }
  const widthPx = (unfold.widthMm / 25.4) * dpi;
  const heightPx = (unfold.heightMm / 25.4) * dpi;
  return { dpi, widthPx, heightPx };
}

/** Rounded pixel dimensions (export briefs; aspect may differ slightly from exact ratio). */
export function computeLabelUnfoldPixelsRounded(
  unfold: LabelUnfoldMm,
  dpi: number,
  round: (n: number) => number = Math.round,
): LabelUnfoldPixels {
  const raw = computeLabelUnfoldPixels(unfold, dpi);
  return {
    dpi,
    widthPx: round(raw.widthPx),
    heightPx: round(raw.heightPx),
  };
}

export function imageMatchesLabelUnfoldAspect(
  imageWidthPx: number,
  imageHeightPx: number,
  unfold: LabelUnfoldMm,
  tolerance = 1e-3,
): boolean {
  if (imageWidthPx <= 0 || imageHeightPx <= 0) {
    return false;
  }
  const target = computeLabelUnfoldAspect(unfold).widthOverHeight;
  const actual = imageWidthPx / imageHeightPx;
  return Math.abs(actual - target) <= tolerance * target;
}

/** Common design DPIs for documentation / briefs */
const LABEL_UNFOLD_REFERENCE_DPIS = [72, 150, 300] as const;

export function labelUnfoldPixelsForReferenceDpis(
  profile: BeverageCanBodyProfile,
): Record<number, LabelUnfoldPixels> {
  const unfold = computeLabelUnfoldForProfile(profile);
  const out: Record<number, LabelUnfoldPixels> = {};
  for (const dpi of LABEL_UNFOLD_REFERENCE_DPIS) {
    out[dpi] = computeLabelUnfoldPixelsRounded(unfold, dpi);
  }
  return out;
}
