import { describe, expect, it } from 'vitest';
import { buildHandheldFrameGeometryCsg } from './handheld-frame-csg';
import {
  createHandheldBackPlateGeometry,
  createScreenOpeningCutterGeometry,
} from './handheld-geometry';
import { computeHandheldLayerStack } from './handheld-layer-stack';

describe('buildHandheldFrameGeometryCsg', () => {
  const stackInput = {
    screenWidth: 0.09,
    screenHeight: 0.16,
    innerRadius: 0.006,
    outerWidth: 0.095,
    outerHeight: 0.165,
    outerRadius: 0.0085,
    bodyDepth: 0.008,
    sizeScale: 1,
  };

  function triangleCount(geometry: {
    getAttribute(name: string): { count: number };
    index: { count: number } | null;
  }): number {
    const index = geometry.index;
    if (index) {return index.count / 3;}
    return geometry.getAttribute('position').count / 3;
  }

  it('builds frame geometry with vertices', () => {
    const stack = computeHandheldLayerStack(stackInput);
    const frame = buildHandheldFrameGeometryCsg(stack, 1);
    expect(frame.getAttribute('position').count).toBeGreaterThan(0);
    frame.dispose();
  });

  it('keeps frame mesh complexity within CSG budget', () => {
    const stack = computeHandheldLayerStack(stackInput);
    const frame = buildHandheldFrameGeometryCsg(stack, 1, 0.001);
    expect(triangleCount(frame)).toBeLessThan(25_000);
    frame.dispose();
  });

  it('has a through-hole — no vertices in screen center', () => {
    const stack = computeHandheldLayerStack(stackInput);
    const frame = buildHandheldFrameGeometryCsg(stack, 1);
    const positions = frame.getAttribute('position');

    let centerVertices = 0;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      if (
        Math.abs(x) < 0.02 &&
        Math.abs(y) < 0.02 &&
        z > stack.frameBackZ &&
        z < stack.frameFrontZ
      ) {
        centerVertices++;
      }
    }

    expect(centerVertices).toBe(0);
    frame.dispose();
  });

  it('base backplate matches screen opening size', () => {
    const stack = computeHandheldLayerStack(stackInput);
    const opening = createScreenOpeningCutterGeometry(
      stack.screenWidth,
      stack.screenHeight,
      stack.innerRadius,
      stack.bodyDepth,
    );
    const backplate = createHandheldBackPlateGeometry(
      stack.innerBack.width,
      stack.innerBack.height,
      stack.innerBack.cornerRadius,
      0.001,
    );
    opening.computeBoundingBox();
    backplate.computeBoundingBox();
    const openingBox = opening.boundingBox!;
    const backBox = backplate.boundingBox!;

    expect(backBox.max.x).toBeCloseTo(openingBox.max.x, 4);
    expect(backBox.min.x).toBeCloseTo(openingBox.min.x, 4);
    expect(backBox.max.y).toBeCloseTo(openingBox.max.y, 4);
    expect(backBox.min.y).toBeCloseTo(openingBox.min.y, 4);

    opening.dispose();
    backplate.dispose();
  });
});
