import {
  HANDHELD_FRONT_GLASS_THICKNESS_MM,
  HANDHELD_GLASS_SCREEN_Z_GAP_MM,
  HANDHELD_INNER_BACK_PLATE_THICKNESS_MM,
  HANDHELD_LAYER_Z_GAP_MM,
  HANDHELD_LAYER_Z_OVERHANG_MM,
  HANDHELD_OUTER_BACK_PLATE_THICKNESS_MM,
  SIDE_BUTTON_LENGTH_MM,
  SIDE_BUTTON_SPACING_MM,
} from '@/scene/asset-handheld';

export interface HandheldLayerBounds {
  zFront: number;
  zBack: number;
  width: number;
  height: number;
  cornerRadius: number;
}

export interface SideButtonCenter {
  x: number;
  y: number;
  z: number;
}

export interface HandheldLayerStack {
  bodyDepth: number;
  frameFrontZ: number;
  frameBackZ: number;
  screenWidth: number;
  screenHeight: number;
  innerRadius: number;
  outerWidth: number;
  outerHeight: number;
  outerRadius: number;
  /** Right side wall outer face (x = +outerWidth/2). */
  sideWallOuterX: number;
  /** Right side wall inner face at screen opening (x = +screenWidth/2). */
  sideWallInnerX: number;
  /** Bezel thickness in X (outerWidth - screenWidth) / 2. */
  sideWallThicknessX: number;
  frontGlass: HandheldLayerBounds;
  screen: HandheldLayerBounds;
  innerBack: HandheldLayerBounds;
  outerBackGlass: HandheldLayerBounds;
  sideButtonCenters: SideButtonCenter[];
}

export interface HandheldLayerStackInput {
  screenWidth: number;
  screenHeight: number;
  innerRadius: number;
  outerWidth: number;
  outerHeight: number;
  outerRadius: number;
  bodyDepth: number;
  sizeScale: number;
  glazingVisible?: boolean;
  /** Y center factor for stacked side buttons (handheld upper half: 0.25, monitor lower: -0.25). */
  sideButtonCenterYFactor?: number;
}

export const HANDHELD_SIDE_BUTTON_CENTER_Y_FACTOR = 0.25;
export const MONITOR_SIDE_BUTTON_CENTER_Y_FACTOR = -0.25;

function holeBounds(
  width: number,
  height: number,
  cornerRadius: number,
  zFront: number,
  zBack: number,
): HandheldLayerBounds {
  return {
    zFront,
    zBack,
    width,
    height,
    cornerRadius,
  };
}

/** Sum of all layer thicknesses + gaps (screen is 0-d thick). */
export function handheldStackDepthMm(glazingVisible = true): number {
  let depth =
    HANDHELD_OUTER_BACK_PLATE_THICKNESS_MM +
    HANDHELD_LAYER_Z_GAP_MM +
    HANDHELD_INNER_BACK_PLATE_THICKNESS_MM +
    HANDHELD_LAYER_Z_GAP_MM;

  if (glazingVisible) {
    depth += HANDHELD_GLASS_SCREEN_Z_GAP_MM + HANDHELD_FRONT_GLASS_THICKNESS_MM;
  }

  return depth;
}

export function computeHandheldLayerStack(
  input: HandheldLayerStackInput,
): HandheldLayerStack {
  const mm = 0.001 * input.sizeScale;
  const zOverhang = HANDHELD_LAYER_Z_OVERHANG_MM * mm;
  const layerGap = HANDHELD_LAYER_Z_GAP_MM * mm;
  const glassScreenGap = HANDHELD_GLASS_SCREEN_Z_GAP_MM * mm;
  const glassThickness = HANDHELD_FRONT_GLASS_THICKNESS_MM * mm;
  const innerBackThickness = HANDHELD_INNER_BACK_PLATE_THICKNESS_MM * mm;
  const outerBackThickness = HANDHELD_OUTER_BACK_PLATE_THICKNESS_MM * mm;
  const glazingVisible = input.glazingVisible ?? true;
  const frameFrontZ = 0;
  const frameBackZ = -input.bodyDepth;

  const outerBackZBack = frameBackZ - zOverhang;
  const outerBackZFront = outerBackZBack + outerBackThickness;

  let frontGlassZFront = frameFrontZ;
  let frontGlassZBack = frameFrontZ;
  let screenZ: number;
  if (glazingVisible) {
    frontGlassZFront = frameFrontZ + zOverhang;
    frontGlassZBack = frontGlassZFront - glassThickness;
    screenZ = frontGlassZBack - glassScreenGap;
  } else {
    screenZ = frameFrontZ;
  }
  const innerBackZBack = outerBackZFront + layerGap;
  const innerBackZFront = innerBackZBack + innerBackThickness;

  const lengthY = SIDE_BUTTON_LENGTH_MM * mm;
  const edgeGap = SIDE_BUTTON_SPACING_MM * mm;
  const centerFactor =
    input.sideButtonCenterYFactor ?? HANDHELD_SIDE_BUTTON_CENTER_Y_FACTOR;
  const centerY = input.outerHeight * centerFactor;
  const sideWallOuterX = input.outerWidth * 0.5;
  const sideWallInnerX = input.screenWidth * 0.5;
  const sideWallThicknessX = sideWallOuterX - sideWallInnerX;
  const zCenter = -input.bodyDepth * 0.5;
  const halfStack = (lengthY + edgeGap) * 0.5;

  const { screenWidth, screenHeight, innerRadius } = input;

  const frontGlass = holeBounds(
    screenWidth,
    screenHeight,
    innerRadius,
    frontGlassZFront,
    frontGlassZBack,
  );
  const screen = holeBounds(
    screenWidth,
    screenHeight,
    innerRadius,
    screenZ,
    screenZ,
  );
  const innerBack = holeBounds(
    screenWidth,
    screenHeight,
    innerRadius,
    innerBackZFront,
    innerBackZBack,
  );
  const outerBackGlass = holeBounds(
    screenWidth,
    screenHeight,
    innerRadius,
    outerBackZFront,
    outerBackZBack,
  );

  return {
    bodyDepth: input.bodyDepth,
    frameFrontZ,
    frameBackZ,
    screenWidth,
    screenHeight,
    innerRadius,
    outerWidth: input.outerWidth,
    outerHeight: input.outerHeight,
    outerRadius: input.outerRadius,
    sideWallOuterX,
    sideWallInnerX,
    sideWallThicknessX,
    frontGlass,
    screen,
    innerBack,
    outerBackGlass,
    sideButtonCenters: [
      { x: sideWallOuterX, y: centerY + halfStack, z: zCenter },
      { x: sideWallOuterX, y: centerY - halfStack, z: zCenter },
    ],
  };
}

function layerZGap(frontLayer: HandheldLayerBounds, backLayer: HandheldLayerBounds): number {
  return frontLayer.zBack - backLayer.zFront;
}

const XY_EPSILON = 1e-9;
const Z_GAP_EPSILON = 1e-9;

/**
 * Asserts stack invariants: content matches screen opening, Z ordering, gaps.
 * Throws on violation — call in tests and optionally in dev builds.
 */
export function validateHandheldLayerStack(stack: HandheldLayerStack): void {
  const minBackGap = HANDHELD_LAYER_Z_GAP_MM * 0.001;
  const minGlassScreenGap = HANDHELD_GLASS_SCREEN_Z_GAP_MM * 0.001;
  const zOverhang = HANDHELD_LAYER_Z_OVERHANG_MM * 0.001;

  const contentLayers = [
    stack.frontGlass,
    stack.screen,
    stack.innerBack,
    stack.outerBackGlass,
  ];

  for (const layer of contentLayers) {
    if (Math.abs(layer.width - stack.screenWidth) > XY_EPSILON) {
      throw new Error('content width must equal screen opening');
    }
    if (Math.abs(layer.height - stack.screenHeight) > XY_EPSILON) {
      throw new Error('content height must equal screen opening');
    }
    if (Math.abs(layer.cornerRadius - stack.innerRadius) > XY_EPSILON) {
      throw new Error('content corner radius must equal screen opening');
    }
  }

  if (Math.abs(stack.screen.zFront - stack.screen.zBack) > Z_GAP_EPSILON) {
    throw new Error('screen must be zero-thickness plane');
  }

  const hasFrontGlass = stack.frontGlass.zFront > stack.frameFrontZ + Z_GAP_EPSILON;
  if (hasFrontGlass) {
    if (stack.frontGlass.zFront < stack.frameFrontZ + zOverhang - Z_GAP_EPSILON) {
      throw new Error('front glass Z overhang below minimum');
    }
    if (layerZGap(stack.frontGlass, stack.screen) < minGlassScreenGap - Z_GAP_EPSILON) {
      throw new Error('gap between front glass and screen too small');
    }
  }

  if (stack.screen.zBack <= stack.innerBack.zFront + Z_GAP_EPSILON) {
    throw new Error('screen must sit in front of inner backplate');
  }

  const innerToOuterGap = stack.innerBack.zBack - stack.outerBackGlass.zFront;
  if (Math.abs(innerToOuterGap - minBackGap) > 1e-6) {
    throw new Error('inner backplate must sit 1 mm in front of outer backplate');
  }

  if (stack.outerBackGlass.zBack > stack.frameBackZ - zOverhang + Z_GAP_EPSILON) {
    throw new Error('outer back Z overhang below minimum');
  }

  const totalDepth = stack.frameFrontZ - stack.frameBackZ;
  if (totalDepth > stack.bodyDepth + 1e-9) {
    throw new Error('total frame depth exceeds body depth');
  }
}
