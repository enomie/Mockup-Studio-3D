import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  BufferAttribute,
  ExtrudeGeometry,
  Path,
  Shape,
  type BufferGeometry,
} from 'three/webgpu';

export type FrameGeometryParams = {
  faceWidth: number;
  faceHeight: number;
  frameThickness: number;
  frameDepth: number;
};

const CAP_EPSILON_RATIO = 0.02;

function buildFrameShape(
  halfOuterW: number,
  halfOuterH: number,
  halfFaceW: number,
  halfFaceH: number,
): Shape {
  const shape = new Shape();
  shape.moveTo(-halfOuterW, -halfOuterH);
  shape.lineTo(halfOuterW, -halfOuterH);
  shape.lineTo(halfOuterW, halfOuterH);
  shape.lineTo(-halfOuterW, halfOuterH);
  shape.closePath();

  const hole = new Path();
  hole.moveTo(-halfFaceW, -halfFaceH);
  hole.lineTo(halfFaceW, -halfFaceH);
  hole.lineTo(halfFaceW, halfFaceH);
  hole.lineTo(-halfFaceW, halfFaceH);
  hole.closePath();
  shape.holes.push(hole);

  return shape;
}

type FrameUvSample = {
  u: number;
  v: number;
};

type FrameBarSide = 'top' | 'bottom' | 'right' | 'left' | 'interior';

function resolveFrameBarSide(
  x: number,
  y: number,
  halfFaceW: number,
  halfFaceH: number,
): FrameBarSide {
  if (y >= halfFaceH) return 'top';
  if (y <= -halfFaceH) return 'bottom';
  if (x >= halfFaceW) return 'right';
  if (x <= -halfFaceW) return 'left';
  return 'interior';
}

/**
 * Global arc-length s along the outer frame midline (CCW from bottom-left).
 * Same s for inner and outer faces at the same along-bar coordinate.
 */
export function computeFramePerimeterS(
  x: number,
  y: number,
  params: FrameGeometryParams,
): number {
  const { faceWidth, faceHeight, frameThickness } = params;
  const halfFaceW = faceWidth * 0.5;
  const halfFaceH = faceHeight * 0.5;
  const outerWidth = faceWidth + frameThickness * 2;
  const outerHeight = faceHeight + frameThickness * 2;
  const halfOuterW = outerWidth * 0.5;
  const halfOuterH = outerHeight * 0.5;

  const bar = resolveFrameBarSide(x, y, halfFaceW, halfFaceH);

  switch (bar) {
    case 'bottom':
      return x + halfOuterW;
    case 'right':
      return outerWidth + y + halfOuterH;
    case 'top':
      return outerWidth + outerHeight + (halfOuterW - x);
    case 'left':
      return 2 * outerWidth + outerHeight + (halfOuterH - y);
    default:
      return x + halfOuterW;
  }
}

function sampleFramePerimeterUv(
  x: number,
  y: number,
  z: number,
  params: FrameGeometryParams,
): FrameUvSample {
  const { faceWidth, faceHeight, frameThickness, frameDepth } = params;
  const halfFaceW = faceWidth * 0.5;
  const halfFaceH = faceHeight * 0.5;

  const u = computeFramePerimeterS(x, y, params);
  const bar = resolveFrameBarSide(x, y, halfFaceW, halfFaceH);

  let vCross: number;
  switch (bar) {
    case 'top':
      vCross = (y - halfFaceH) / frameThickness;
      break;
    case 'bottom':
      vCross = (-halfFaceH - y) / frameThickness;
      break;
    case 'right':
      vCross = (x - halfFaceW) / frameThickness;
      break;
    case 'left':
      vCross = (-halfFaceW - x) / frameThickness;
      break;
    default:
      vCross = 0.5;
      break;
  }

  const capEpsilon = frameDepth * CAP_EPSILON_RATIO;
  const isFrontCap = z > -capEpsilon;
  const isBackCap = z < -frameDepth + capEpsilon;
  const v = isFrontCap || isBackCap ? vCross : -z / frameDepth;

  return { u, v };
}

function assignExtrudedFrameUvs(
  geometry: BufferGeometry,
  params: FrameGeometryParams,
): void {
  const position = geometry.getAttribute('position');
  const uvArray = new Float32Array(position.count * 2);

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const { u, v } = sampleFramePerimeterUv(x, y, z, params);
    uvArray[i * 2] = u;
    uvArray[i * 2 + 1] = v;
  }

  geometry.setAttribute('uv', new BufferAttribute(uvArray, 2));
}

export function createExtrudedFrameGeometry(
  faceWidth: number,
  faceHeight: number,
  frameThickness: number,
  frameDepth: number,
): BufferGeometry {
  const outerWidth = faceWidth + frameThickness * 2;
  const outerHeight = faceHeight + frameThickness * 2;
  const halfOuterW = outerWidth * 0.5;
  const halfOuterH = outerHeight * 0.5;
  const halfFaceW = faceWidth * 0.5;
  const halfFaceH = faceHeight * 0.5;

  const shape = buildFrameShape(halfOuterW, halfOuterH, halfFaceW, halfFaceH);
  const geometry = new ExtrudeGeometry(shape, {
    depth: frameDepth,
    bevelEnabled: false,
  });

  geometry.translate(0, 0, -frameDepth);

  const params: FrameGeometryParams = {
    faceWidth,
    faceHeight,
    frameThickness,
    frameDepth,
  };
  assignExtrudedFrameUvs(geometry, params);
  toCreasedNormals(geometry, Math.PI / 2);

  return geometry;
}

/** Extrude groups: 0 = front/back caps, 1 = side walls. Front cap at local z = 0. */
export function createRectangularGlassSlabGeometry(
  width: number,
  height: number,
  thickness: number,
): BufferGeometry {
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  const shape = new Shape();
  shape.moveTo(-halfW, -halfH);
  shape.lineTo(halfW, -halfH);
  shape.lineTo(halfW, halfH);
  shape.lineTo(-halfW, halfH);
  shape.closePath();

  const geometry = new ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -thickness);
  toCreasedNormals(geometry, Math.PI / 2);
  return geometry;
}
