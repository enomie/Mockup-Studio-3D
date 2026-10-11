import { Vector3, type BufferGeometry } from 'three/webgpu';
import {
  SIDE_BUTTON_HOLE_EXTRA_MM,
  SIDE_BUTTON_LENGTH_MM,
  SIDE_BUTTON_THICKNESS_MM,
} from '@/scene/asset-handheld';
import { subtractGeometries, type CsgCutterPlacement } from './csg-subtract';
import type { HandheldLayerStack } from './handheld-layer-stack';
import {
  createHandheldSolidFrameGeometry,
  createLayerCutterGeometry,
  createScreenOpeningCutterGeometry,
  createSideButtonHoleCutterGeometry,
  HANDHELD_CSG_EPSILON_M,
} from './handheld-geometry';

export type { CsgCutterPlacement };

export function buildHandheldFrameGeometryCsg(
  stack: HandheldLayerStack,
  sizeScale: number,
  outerEdgeRadius = 0,
): BufferGeometry {
  const mm = 0.001 * sizeScale;
  const csgPad = HANDHELD_CSG_EPSILON_M;
  const holeDepth = stack.sideWallThicknessX + SIDE_BUTTON_HOLE_EXTRA_MM * mm;
  const sideButtonLengthY = SIDE_BUTTON_LENGTH_MM * mm;
  const sideButtonWidthZ = SIDE_BUTTON_THICKNESS_MM * mm;

  const solidGeometry = createHandheldSolidFrameGeometry(
    stack.outerWidth,
    stack.outerHeight,
    stack.outerRadius,
    stack.bodyDepth,
    outerEdgeRadius,
  );

  const openingGeometry = createScreenOpeningCutterGeometry(
    stack.screenWidth,
    stack.screenHeight,
    stack.innerRadius,
    stack.bodyDepth,
  );

  const buttonCutterGeometry = createSideButtonHoleCutterGeometry(
    sideButtonLengthY,
    sideButtonWidthZ,
    holeDepth,
    csgPad,
  );

  const recessGeometry = createLayerCutterGeometry(
    stack.outerBackGlass.width,
    stack.outerBackGlass.height,
    stack.outerBackGlass.cornerRadius,
    stack.outerBackGlass.zFront,
    stack.outerBackGlass.zBack,
  );

  const cutters: CsgCutterPlacement[] = [
    { geometry: openingGeometry },
    { geometry: recessGeometry },
    ...stack.sideButtonCenters.map((center) => ({
      geometry: buttonCutterGeometry,
      position: new Vector3(center.x + csgPad, center.y, center.z),
    })),
  ];

  if (stack.frontGlass.zBack < stack.frameFrontZ - 1e-9) {
    const glassRecessGeometry = createLayerCutterGeometry(
      stack.frontGlass.width,
      stack.frontGlass.height,
      stack.frontGlass.cornerRadius,
      stack.frameFrontZ,
      stack.frontGlass.zBack,
    );
    cutters.push({ geometry: glassRecessGeometry });
  }

  const frameGeometry = subtractGeometries(solidGeometry, cutters);
  buttonCutterGeometry.dispose();

  return frameGeometry;
}
