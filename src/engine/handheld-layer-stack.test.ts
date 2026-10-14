import { describe, expect, it } from 'vitest';
import {
  computeHandheldLayerStack,
  HANDHELD_SIDE_BUTTON_CENTER_Y_FACTOR,
  handheldStackDepthMm,
  MONITOR_SIDE_BUTTON_CENTER_Y_FACTOR,
  validateHandheldLayerStack,
} from './handheld-layer-stack';

describe('computeHandheldLayerStack', () => {
  const base = {
    screenWidth: 0.09,
    screenHeight: 0.16,
    innerRadius: 0.006,
    outerWidth: 0.095,
    outerHeight: 0.165,
    outerRadius: 0.0085,
    bodyDepth: 0.008,
    sizeScale: 1,
  };

  it('all content layers match screen opening exactly', () => {
    const stack = computeHandheldLayerStack(base);
    const layers = [
      stack.frontGlass,
      stack.screen,
      stack.innerBack,
      stack.outerBackGlass,
    ];

    for (const layer of layers) {
      expect(layer.width).toBe(base.screenWidth);
      expect(layer.height).toBe(base.screenHeight);
      expect(layer.cornerRadius).toBe(base.innerRadius);
    }
  });

  it('layers stack front to back without overlap', () => {
    const stack = computeHandheldLayerStack(base);

    expect(stack.frontGlass.zFront).toBeGreaterThan(stack.frameFrontZ);
    expect(stack.screen.zFront).toBeLessThan(stack.frontGlass.zBack);
    expect(stack.screen.zBack).toBeGreaterThan(stack.innerBack.zFront);
    expect(stack.innerBack.zBack).toBeGreaterThan(stack.outerBackGlass.zFront);
    expect(stack.outerBackGlass.zBack).toBeLessThan(stack.frameBackZ);
  });

  it('screen is a zero-thickness plane', () => {
    const stack = computeHandheldLayerStack(base);
    expect(stack.screen.zFront).toBe(stack.screen.zBack);
  });

  it('reports required stack depth with front glass and without', () => {
    expect(handheldStackDepthMm(true)).toBeCloseTo(5.02, 5);
    expect(handheldStackDepthMm(false)).toBe(4);
  });

  it('keeps screen flush against display glass inner face', () => {
    const stack = computeHandheldLayerStack(base);
    const gap = stack.frontGlass.zBack - stack.screen.zFront;
    expect(gap).toBeCloseTo(0.00002, 8);
  });

  it('passes validateHandheldLayerStack', () => {
    const stack = computeHandheldLayerStack(base);
    expect(() => { validateHandheldLayerStack(stack); }).not.toThrow();
  });

  it('places screen at frame front when display glass is hidden', () => {
    const stack = computeHandheldLayerStack({ ...base, glazingVisible: false });
    expect(stack.screen.zFront).toBeCloseTo(0, 6);
    expect(stack.screen.width).toBe(base.screenWidth);
    expect(stack.screen.height).toBe(base.screenHeight);
  });

  it('places side buttons in upper half by default', () => {
    const stack = computeHandheldLayerStack(base);
    expect(stack.sideButtonCenters[0].y).toBeGreaterThan(0);
    const stackMidY =
      (stack.sideButtonCenters[0].y + stack.sideButtonCenters[1].y) / 2;
    expect(stackMidY).toBeCloseTo(
      base.outerHeight * HANDHELD_SIDE_BUTTON_CENTER_Y_FACTOR,
      6,
    );
  });

  it('places side buttons in lower half when factor is negative', () => {
    const stack = computeHandheldLayerStack({
      ...base,
      sideButtonCenterYFactor: MONITOR_SIDE_BUTTON_CENTER_Y_FACTOR,
    });
    expect(stack.sideButtonCenters[0].y).toBeLessThan(0);
  });
});
