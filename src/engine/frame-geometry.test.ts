import { describe, expect, it } from 'vitest';
import {
  computeFramePerimeterS,
  createExtrudedFrameGeometry,
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

describe('createExtrudedFrameGeometry', () => {
  const geometry = createExtrudedFrameGeometry(0.5, 0.6, FRAME_THICKNESS, FRAME_DEPTH);
  const pos = geometry.getAttribute('position');
  const nrm = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  const triCount = pos.count / 3;

  it('has triangle winding consistent with the stored normals', () => {
    for (let t = 0; t < triCount; t++) {
      const i = t * 3;
      const ax = pos.getX(i + 1) - pos.getX(i);
      const ay = pos.getY(i + 1) - pos.getY(i);
      const az = pos.getZ(i + 1) - pos.getZ(i);
      const bx = pos.getX(i + 2) - pos.getX(i);
      const by = pos.getY(i + 2) - pos.getY(i);
      const bz = pos.getZ(i + 2) - pos.getZ(i);
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;
      const dot = cx * nrm.getX(i) + cy * nrm.getY(i) + cz * nrm.getZ(i);
      expect(dot).toBeGreaterThan(0);
    }
  });

  it('uses meter UVs with no triangle stretched across bars', () => {
    const outerPerimeter = 2 * (0.5 + 0.6 + FRAME_THICKNESS * 4);
    for (let t = 0; t < triCount; t++) {
      const us = [0, 1, 2].map((k) => uv.getX(t * 3 + k));
      const vs = [0, 1, 2].map((k) => uv.getY(t * 3 + k));
      expect(Math.max(...us) - Math.min(...us)).toBeLessThanOrEqual(0.6 + FRAME_THICKNESS * 2 + 1e-6);
      expect(Math.max(...vs) - Math.min(...vs)).toBeLessThanOrEqual(
        Math.max(FRAME_THICKNESS, FRAME_DEPTH) + 1e-6,
      );
      for (const u of us) {
        expect(u).toBeGreaterThanOrEqual(-1e-6);
        expect(u).toBeLessThanOrEqual(outerPerimeter + 1e-6);
      }
    }
  });

  it('maps the left outer wall to its own perimeter range', () => {
    const outerWidth = 0.5 + FRAME_THICKNESS * 2;
    const outerHeight = 0.6 + FRAME_THICKNESS * 2;
    for (let i = 0; i < pos.count; i++) {
      if (nrm.getX(i) < -0.5) {
        const isOuter = pos.getX(i) < -0.25 - FRAME_THICKNESS * 0.5;
        if (!isOuter) {continue;}
        expect(uv.getX(i)).toBeGreaterThanOrEqual(2 * outerWidth + outerHeight - 1e-6);
        expect(uv.getX(i)).toBeLessThanOrEqual(2 * outerWidth + 2 * outerHeight + 1e-6);
      }
    }
  });
});
