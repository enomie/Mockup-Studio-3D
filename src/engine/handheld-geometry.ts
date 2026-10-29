import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  BufferAttribute,
  ExtrudeGeometry,
  Path,
  Shape,
  ShapeGeometry,
  type BufferGeometry,
} from 'three/webgpu';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

/** CSG pad to avoid coplanar caps on frame faces (screen opening, button holes). */
export const HANDHELD_CSG_EPSILON_M = 0.0001;
const CORNER_EPSILON_M = HANDHELD_CSG_EPSILON_M;

/** Visible frame / screen contour (Three.js default is 12). */
const HANDHELD_FRAME_CURVE_SEGMENTS = 12;
/** Coarse arcs on CSG cutters — not visible, keeps boolean eval fast. */
const HANDHELD_CSG_CURVE_SEGMENTS = 6;
const HANDHELD_BEVEL_SEGMENTS = 3;

export function clampCornerRadius(
  width: number,
  height: number,
  radius: number,
): number {
  const maxRadius = Math.min(width, height) * 0.5 - CORNER_EPSILON_M;
  return Math.max(0, Math.min(radius, maxRadius));
}

interface RoundedRectContourTarget {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  absarc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    clockwise: boolean,
  ): void;
}

/**
 * Rounded rectangle centered at origin (XY). Outer shapes: clockwise; holes: counter-clockwise.
 */
export function appendRoundedRectContour(
  target: RoundedRectContourTarget,
  width: number,
  height: number,
  cornerRadius: number,
  clockwise: boolean,
): void {
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  const r = clampCornerRadius(width, height, cornerRadius);

  if (r <= 0) {
    if (clockwise) {
      target.moveTo(-halfW, -halfH);
      target.lineTo(halfW, -halfH);
      target.lineTo(halfW, halfH);
      target.lineTo(-halfW, halfH);
      target.lineTo(-halfW, -halfH);
    } else {
      target.moveTo(-halfW, -halfH);
      target.lineTo(-halfW, halfH);
      target.lineTo(halfW, halfH);
      target.lineTo(halfW, -halfH);
      target.lineTo(-halfW, -halfH);
    }
    return;
  }

  if (clockwise) {
    target.moveTo(-halfW + r, -halfH);
    target.lineTo(halfW - r, -halfH);
    target.absarc(halfW - r, -halfH + r, r, -Math.PI / 2, 0, false);
    target.lineTo(halfW, halfH - r);
    target.absarc(halfW - r, halfH - r, r, 0, Math.PI / 2, false);
    target.lineTo(-halfW + r, halfH);
    target.absarc(-halfW + r, halfH - r, r, Math.PI / 2, Math.PI, false);
    target.lineTo(-halfW, -halfH + r);
    target.absarc(-halfW + r, -halfH + r, r, Math.PI, Math.PI * 1.5, false);
    return;
  }

  target.moveTo(-halfW + r, -halfH);
  target.absarc(-halfW + r, -halfH + r, r, Math.PI * 1.5, Math.PI, true);
  target.lineTo(-halfW, halfH - r);
  target.absarc(-halfW + r, halfH - r, r, Math.PI, Math.PI / 2, true);
  target.lineTo(halfW - r, halfH);
  target.absarc(halfW - r, halfH - r, r, Math.PI / 2, 0, true);
  target.lineTo(halfW, -halfH + r);
  target.absarc(halfW - r, -halfH + r, r, 0, -Math.PI / 2, true);
}

/**
 * Rounded rectangle centered at origin (XY plane), traced clockwise.
 */
export function createRoundedRectShape(
  width: number,
  height: number,
  cornerRadius: number,
): Shape {
  const shape = new Shape();
  appendRoundedRectContour(shape, width, height, cornerRadius, true);
  return shape;
}

export function createHandheldFrameRingShape(
  outerWidth: number,
  outerHeight: number,
  outerRadius: number,
  innerWidth: number,
  innerHeight: number,
  innerRadius: number,
): Shape {
  const shape = createRoundedRectShape(outerWidth, outerHeight, outerRadius);
  const hole = new Path();
  appendRoundedRectContour(hole, innerWidth, innerHeight, innerRadius, false);
  shape.holes.push(hole);
  return shape;
}

function assignPlanarUvs(geometry: BufferGeometry): void {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) {return;}

  const position = geometry.getAttribute('position');
  const uvArray = new Float32Array(position.count * 2);
  const width = box.max.x - box.min.x;
  const height = box.max.y - box.min.y;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    uvArray[i * 2] = width > 0 ? (x - box.min.x) / width : 0.5;
    uvArray[i * 2 + 1] = height > 0 ? (y - box.min.y) / height : 0.5;
  }

  geometry.setAttribute('uv', new BufferAttribute(uvArray, 2));
}

export function createRoundedScreenGeometry(
  width: number,
  height: number,
  cornerRadius: number,
): BufferGeometry {
  const shape = createRoundedRectShape(width, height, cornerRadius);
  const geometry = new ShapeGeometry(shape, HANDHELD_FRAME_CURVE_SEGMENTS);
  assignPlanarUvs(geometry);
  ensureGeometryTangents(geometry);
  return geometry;
}

function alignExtrusionFrontToZZero(geometry: BufferGeometry): void {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) {return;}
  geometry.translate(0, 0, -box.max.z);
}

interface ExtrudeAlongZOptions {
  outerEdgeRadius?: number;
  curveSegments?: number;
}

function extrudeShapeAlongZ(
  shape: Shape,
  depth: number,
  options: ExtrudeAlongZOptions = {},
): BufferGeometry {
  const { outerEdgeRadius = 0, curveSegments = HANDHELD_FRAME_CURVE_SEGMENTS } =
    options;
  const maxBevel = depth * 0.5 - CORNER_EPSILON_M;
  const effectiveBevel =
    outerEdgeRadius > 0 ? Math.min(outerEdgeRadius, maxBevel) : 0;
  const extrudeDepth =
    effectiveBevel > 0 ? depth - 2 * effectiveBevel : depth;

  const geometry = new ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: effectiveBevel > 0,
    bevelThickness: effectiveBevel,
    bevelSize: effectiveBevel,
    bevelSegments: effectiveBevel > 0 ? HANDHELD_BEVEL_SEGMENTS : 1,
    curveSegments,
  });
  geometry.translate(0, 0, -extrudeDepth);
  if (effectiveBevel > 0) {
    alignExtrusionFrontToZZero(geometry);
  }
  toCreasedNormals(geometry, Math.PI / 2);
  ensureGeometryTangents(geometry);
  return geometry;
}

function extrudeRoundedRectAlongZ(
  width: number,
  height: number,
  cornerRadius: number,
  depth: number,
  options: ExtrudeAlongZOptions = {},
): BufferGeometry {
  const shape = createRoundedRectShape(width, height, cornerRadius);
  return extrudeShapeAlongZ(shape, depth, options);
}

/** Bezel ring (outer contour minus screen opening) before recess/button CSG. */
export function createHandheldFrameRingGeometry(
  outerWidth: number,
  outerHeight: number,
  outerRadius: number,
  innerWidth: number,
  innerHeight: number,
  innerRadius: number,
  bodyDepth: number,
  outerEdgeRadius = 0,
): BufferGeometry {
  const shape = createHandheldFrameRingShape(
    outerWidth,
    outerHeight,
    outerRadius,
    innerWidth,
    innerHeight,
    innerRadius,
  );
  return extrudeShapeAlongZ(shape, bodyDepth, { outerEdgeRadius });
}

/** Solid outer block before CSG screen opening and button holes. */
export function createHandheldSolidFrameGeometry(
  outerWidth: number,
  outerHeight: number,
  outerRadius: number,
  bodyDepth: number,
  outerEdgeRadius = 0,
): BufferGeometry {
  return extrudeRoundedRectAlongZ(
    outerWidth,
    outerHeight,
    outerRadius,
    bodyDepth,
    { outerEdgeRadius },
  );
}

/**
 * Full-depth cutter for the screen opening (CSG subtract from solid frame).
 * Extends slightly past front (z=0) and back so coplanar caps do not break CSG.
 */
export function createScreenOpeningCutterGeometry(
  screenWidth: number,
  screenHeight: number,
  screenCornerRadius: number,
  bodyDepth: number,
): BufferGeometry {
  const pad = CORNER_EPSILON_M;
  const depth = bodyDepth + pad * 2;
  const geometry = extrudeRoundedRectAlongZ(
    screenWidth,
    screenHeight,
    screenCornerRadius,
    depth,
    { curveSegments: HANDHELD_CSG_CURVE_SEGMENTS },
  );
  // extrudeRoundedRectAlongZ leaves z in [-depth, 0]; shift so cutter pierces both faces.
  geometry.translate(0, 0, pad);
  return geometry;
}

/** Generic Z-aligned layer cutter between zFront and zBack (world coords, front = 0). */
export function createLayerCutterGeometry(
  width: number,
  height: number,
  cornerRadius: number,
  zFront: number,
  zBack: number,
): BufferGeometry {
  const depth = zFront - zBack;
  const geometry = extrudeRoundedRectAlongZ(width, height, cornerRadius, depth, {
    curveSegments: HANDHELD_CSG_CURVE_SEGMENTS,
  });
  geometry.translate(0, 0, zFront);
  return geometry;
}

/** Extrude groups: 0 = front/back caps, 1 = side walls (pair with frame material on sides). */
export const HANDHELD_EXTRUDE_CAP_GROUP = 0;
export const HANDHELD_EXTRUDE_SIDE_GROUP = 1;

export function createRoundedGlassGeometry(
  width: number,
  height: number,
  cornerRadius: number,
  thickness: number,
): BufferGeometry {
  return extrudeRoundedRectAlongZ(width, height, cornerRadius, thickness);
}

const PILL_MAX_CORNER_RADIUS_M = 0.0003;

function pillCornerRadius(widthZ: number, heightY: number): number {
  const maxBySize = Math.min(widthZ, heightY) * 0.5 - CORNER_EPSILON_M;
  return clampCornerRadius(widthZ, heightY, Math.min(PILL_MAX_CORNER_RADIUS_M, maxBySize));
}

/**
 * Vertical pill in the YZ plane (long axis Y, short axis Z).
 * Shape is built in XY with x = Z and y = Y for extrusion along X.
 */
export function createVerticalPillShape(heightY: number, widthZ: number): Shape {
  return createRoundedRectShape(widthZ, heightY, pillCornerRadius(widthZ, heightY));
}

/** Extrude pill along −X (inward from the right outer wall at local x = 0). */
function extrudePillAlongNegativeX(
  shape: Shape,
  depthX: number,
): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: depthX,
    bevelEnabled: false,
    curveSegments: HANDHELD_CSG_CURVE_SEGMENTS,
  });
  geometry.translate(0, 0, -depthX);
  geometry.rotateY(Math.PI / 2);
  toCreasedNormals(geometry, Math.PI / 2);
  ensureGeometryTangents(geometry);
  return geometry;
}

/**
 * Solid pill cutter for CSG hole subtraction in the frame.
 * Extends `outerPadM` past the outer wall (local +X) so coplanar caps do not
 * leave a shallow pocket instead of a full through-cut.
 */
export function createSideButtonHoleCutterGeometry(
  heightY: number,
  widthZ: number,
  depthX: number,
  outerPadM = HANDHELD_CSG_EPSILON_M,
): BufferGeometry {
  const shape = createVerticalPillShape(heightY, widthZ);
  const geometry = extrudePillAlongNegativeX(shape, depthX + outerPadM);
  geometry.translate(outerPadM, 0, 0);
  return geometry;
}

/** Smaller proud pill for the side button cap. */
export function createSideButtonGeometry(
  heightY: number,
  widthZ: number,
  gapM: number,
  depthX: number,
): BufferGeometry {
  const innerHeight = Math.max(0, heightY - gapM * 2);
  const innerWidth = Math.max(0, widthZ - gapM * 2);
  const shape = createVerticalPillShape(innerHeight, innerWidth);
  return extrudePillAlongNegativeX(shape, depthX);
}

/** Backplate inside the screen opening — same inner contour as screen/glass. */
export function createHandheldBackPlateGeometry(
  screenWidth: number,
  screenHeight: number,
  screenCornerRadius: number,
  thickness: number,
): BufferGeometry {
  return extrudeRoundedRectAlongZ(
    screenWidth,
    screenHeight,
    screenCornerRadius,
    thickness,
  );
}
