import { describe, expect, it } from 'vitest';
import {
  computeFramePerimeterS,
  createRectangularGlassSlabGeometry,
  type FrameGeometryParams,
} from './frame-geometry';

const FRAME_THICKNESS = 0.018;
const FRAME_DEPTH = 0.012;

function frameParams(faceWidth: number, faceHeight: number): FrameGeometryParams {
  return {
    faceWidth,
    faceHeight,
    frameThickness: FRAME_THICKNESS,
    frameDepth: FRAME_DEPTH,
  };
}

describe('computeFramePerimeterS', () => {
  const params = frameParams(0.5, 0.6);
  const halfFaceW = 0.25;
  const halfFaceH = 0.3;
  const outerWidth = 0.5 + FRAME_THICKNESS * 2;
  const outerHeight = 0.6 + FRAME_THICKNESS * 2;
  const halfOuterW = outerWidth * 0.5;
  const halfOuterH = outerHeight * 0.5;

  it('is continuous at outer corners', () => {
    const bottomRight = computeFramePerimeterS(halfOuterW, -halfOuterH, params);
    const rightBottom = computeFramePerimeterS(halfOuterW, -halfOuterH, params);
    expect(bottomRight).toBeCloseTo(outerWidth);
    expect(rightBottom).toBeCloseTo(outerWidth);

    const topRight = computeFramePerimeterS(halfOuterW, halfOuterH, params);
    const rightTop = computeFramePerimeterS(halfOuterW, halfOuterH, params);
    expect(topRight).toBeCloseTo(outerWidth + outerHeight);
    expect(rightTop).toBeCloseTo(outerWidth + outerHeight);

    const topLeft = computeFramePerimeterS(-halfOuterW, halfOuterH, params);
    const leftTop = computeFramePerimeterS(-halfOuterW, halfOuterH, params);
    expect(topLeft).toBeCloseTo(outerWidth + outerHeight + outerWidth);
    expect(leftTop).toBeCloseTo(outerWidth + outerHeight + outerWidth);

    const bottomLeft = computeFramePerimeterS(-halfOuterW, -halfOuterH, params);
    const leftBottom = computeFramePerimeterS(-halfOuterW, -halfOuterH, params);
    expect(bottomLeft).toBeCloseTo(0);
    expect(leftBottom).toBeCloseTo(0);
  });

  it('is continuous at inner miter corners', () => {
    const bottomInner = computeFramePerimeterS(halfFaceW, -halfFaceH, params);
    const rightInner = computeFramePerimeterS(halfFaceW, -halfFaceH, params);
    expect(bottomInner).toBeCloseTo(rightInner);

    const topInner = computeFramePerimeterS(halfFaceW, halfFaceH, params);
    const rightTopInner = computeFramePerimeterS(halfFaceW, halfFaceH, params);
    expect(topInner).toBeCloseTo(rightTopInner);

    const topLeftInner = computeFramePerimeterS(-halfFaceW, halfFaceH, params);
    const leftTopInner = computeFramePerimeterS(-halfFaceW, halfFaceH, params);
    expect(topLeftInner).toBeCloseTo(leftTopInner);

    const bottomLeftInner = computeFramePerimeterS(-halfFaceW, -halfFaceH, params);
    const leftBottomInner = computeFramePerimeterS(-halfFaceW, -halfFaceH, params);
    expect(bottomLeftInner).toBeCloseTo(leftBottomInner);
  });

  it('uses the same s on inner and outer bottom faces at the same x', () => {
    const x = 0.1;
    const outerY = -halfOuterH + FRAME_THICKNESS * 0.25;
    const innerY = -halfFaceH - FRAME_THICKNESS * 0.25;
    const outerS = computeFramePerimeterS(x, outerY, params);
    const innerS = computeFramePerimeterS(x, innerY, params);
    expect(outerS).toBeCloseTo(innerS);
    expect(outerS).toBeCloseTo(x + halfOuterW);
  });

  it('does not restart s at zero on the right bar', () => {
    const y = 0;
    const rightS = computeFramePerimeterS(halfOuterW - FRAME_THICKNESS * 0.5, y, params);
    expect(rightS).toBeGreaterThan(outerWidth * 0.5);
    expect(rightS).toBeCloseTo(outerWidth + y + halfOuterH);
  });
});

describe('createRectangularGlassSlabGeometry', () => {
  it('creates cap and side groups with front cap at z = 0', () => {
    const geometry = createRectangularGlassSlabGeometry(0.5, 0.6, 0.002);
    expect(geometry.groups.length).toBeGreaterThanOrEqual(2);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    expect(box).toBeDefined();
    expect(box!.max.z).toBeCloseTo(0, 6);
    expect(box!.min.z).toBeCloseTo(-0.002, 6);
  });
});
