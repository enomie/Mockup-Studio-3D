import { describe, expect, it } from 'vitest';
import { clampOuterEdgeRadiusMm } from '@/scene/asset-handheld';
import {
  clampCornerRadius,
  createHandheldFrameRingGeometry,
  createHandheldSolidFrameGeometry,
  createHandheldFrameRingShape,
  createRoundedGlassGeometry,
  createRoundedRectShape,
  createRoundedScreenGeometry,
  createScreenOpeningCutterGeometry,
  createSideButtonGeometry,
  createSideButtonHoleCutterGeometry,
  createVerticalPillShape,
  HANDHELD_GLASS_EXTRUDE_CAP_GROUP,
  HANDHELD_GLASS_EXTRUDE_SIDE_GROUP,
} from './handheld-geometry';

describe('clampOuterEdgeRadiusMm', () => {
  it('caps at 3 mm and half of body depth', () => {
    expect(clampOuterEdgeRadiusMm(5, 8)).toBe(3);
    expect(clampOuterEdgeRadiusMm(2, 3)).toBe(1.5);
    expect(clampOuterEdgeRadiusMm(1, 8)).toBe(1);
  });
});

describe('clampCornerRadius', () => {
  it('clamps to half of the shorter edge minus epsilon', () => {
    expect(clampCornerRadius(0.1, 0.2, 0.05)).toBeCloseTo(0.05);
    expect(clampCornerRadius(0.1, 0.2, 0.2)).toBeLessThan(0.1);
  });

  it('returns zero for non-positive requested radius', () => {
    expect(clampCornerRadius(0.1, 0.2, 0)).toBe(0);
  });
});

describe('createHandheldFrameRingShape', () => {
  it('adds one hole path for the screen opening', () => {
    const shape = createHandheldFrameRingShape(
      0.095,
      0.165,
      0.0085,
      0.09,
      0.16,
      0.006,
    );
    expect(shape.holes).toHaveLength(1);
  });
});

describe('createHandheldFrameRingGeometry', () => {
  it('builds extruded ring geometry (optional path, not used in CSG rebuild)', () => {
    const ring = createHandheldFrameRingGeometry(
      0.095,
      0.165,
      0.0085,
      0.09,
      0.16,
      0.006,
      0.008,
    );
    expect(ring.getAttribute('position').count).toBeGreaterThan(0);
    ring.dispose();
  });
});

describe('createRoundedRectShape', () => {
  it('creates a shape with four curve segments when radius is positive', () => {
    const shape = createRoundedRectShape(0.1, 0.2, 0.01);
    expect(shape.curves.length).toBeGreaterThan(4);
  });

  it('creates a rectangular shape when radius is zero', () => {
    const shape = createRoundedRectShape(0.1, 0.2, 0);
    expect(shape.curves).toHaveLength(4);
  });
});

describe('createRoundedScreenGeometry', () => {
  it('produces geometry with uv attribute', () => {
    const geometry = createRoundedScreenGeometry(0.1, 0.2, 0.01);
    expect(geometry.getAttribute('uv')).toBeDefined();
    geometry.dispose();
  });

  it('has zero z thickness', () => {
    const geometry = createRoundedScreenGeometry(0.09, 0.16, 0.006);
    geometry.computeBoundingBox();
    const depth = geometry.boundingBox!.max.z - geometry.boundingBox!.min.z;
    expect(depth).toBeCloseTo(0, 5);
    geometry.dispose();
  });
});

describe('createRoundedGlassGeometry', () => {
  it('exposes cap and side wall material groups', () => {
    const glass = createRoundedGlassGeometry(0.09, 0.16, 0.006, 0.001);
    expect(glass.groups).toHaveLength(2);
    expect(glass.groups[0].materialIndex).toBe(HANDHELD_GLASS_EXTRUDE_CAP_GROUP);
    expect(glass.groups[1].materialIndex).toBe(HANDHELD_GLASS_EXTRUDE_SIDE_GROUP);
    glass.dispose();
  });
});

describe('CSG frame geometry', () => {
  it('creates solid frame and screen opening cutter', () => {
    const solid = createHandheldSolidFrameGeometry(0.095, 0.165, 0.0085, 0.008);
    const cutter = createScreenOpeningCutterGeometry(0.09, 0.16, 0.006, 0.008);
    expect(solid.getAttribute('position')).toBeDefined();
    expect(cutter.getAttribute('position')).toBeDefined();
    solid.dispose();
    cutter.dispose();
  });

  it('keeps the front face at z = 0 when outer edge roundness is applied', () => {
    const bodyDepth = 0.008;
    const solid = createHandheldSolidFrameGeometry(
      0.095,
      0.165,
      0.0085,
      bodyDepth,
      0.001,
    );
    solid.computeBoundingBox();
    expect(solid.boundingBox!.max.z).toBeCloseTo(0, 5);
    expect(solid.boundingBox!.min.z).toBeCloseTo(-bodyDepth, 5);
    solid.dispose();
  });

});

describe('side button geometry', () => {
  const lengthY = 0.007;
  const widthZ = 0.0012;
  const gap = 0.00015;
  const holeDepth = 0.003;
  const buttonDepth = 0.004;

  it('creates a vertical pill shape', () => {
    const shape = createVerticalPillShape(lengthY, widthZ);
    expect(shape.curves.length).toBeGreaterThan(0);
  });

  it('creates hole cutter geometry with position attribute', () => {
    const geometry = createSideButtonHoleCutterGeometry(
      lengthY,
      widthZ,
      holeDepth,
    );
    expect(geometry.getAttribute('position')).toBeDefined();
    geometry.dispose();
  });

  it('creates button geometry with smaller YZ footprint than the hole cutter', () => {
    const cutter = createSideButtonHoleCutterGeometry(
      lengthY,
      widthZ,
      holeDepth,
    );
    const button = createSideButtonGeometry(
      lengthY,
      widthZ,
      gap,
      buttonDepth,
    );
    cutter.computeBoundingBox();
    button.computeBoundingBox();
    const cutterBox = cutter.boundingBox!;
    const buttonBox = button.boundingBox!;
    const cutterSpanY = cutterBox.max.y - cutterBox.min.y;
    const buttonSpanY = buttonBox.max.y - buttonBox.min.y;
    const cutterSpanZ = cutterBox.max.z - cutterBox.min.z;
    const buttonSpanZ = buttonBox.max.z - buttonBox.min.z;
    expect(buttonSpanY).toBeLessThan(cutterSpanY);
    expect(buttonSpanZ).toBeLessThan(cutterSpanZ);
    cutter.dispose();
    button.dispose();
  });
});
