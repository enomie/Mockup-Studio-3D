import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
} from 'three/webgpu';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

export interface FrameGeometryParams {
  faceWidth: number;
  faceHeight: number;
  frameThickness: number;
  frameDepth: number;
}

type FrameBarSide = 'top' | 'bottom' | 'right' | 'left' | 'interior';

function resolveFrameBarSide(
  x: number,
  y: number,
  halfFaceW: number,
  halfFaceH: number,
): FrameBarSide {
  if (y >= halfFaceH) {return 'top';}
  if (y <= -halfFaceH) {return 'bottom';}
  if (x >= halfFaceW) {return 'right';}
  if (x <= -halfFaceW) {return 'left';}
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

interface Vec2 {
  x: number;
  y: number;
}

/** One mitred frame bar: outer/inner edge endpoints in CCW perimeter order. */
interface FrameBar {
  outerStart: Vec2;
  outerEnd: Vec2;
  innerStart: Vec2;
  innerEnd: Vec2;
  /** Unit direction along the bar (CCW around the frame). */
  along: Vec2;
  /** Unit outward normal of the bar (away from the opening). */
  outward: Vec2;
  /** Perimeter arc-length at `outerStart` (meters). */
  sOffset: number;
}

function buildFrameBars(params: FrameGeometryParams): FrameBar[] {
  const { faceWidth, faceHeight, frameThickness } = params;
  const outerWidth = faceWidth + frameThickness * 2;
  const outerHeight = faceHeight + frameThickness * 2;
  const ow = outerWidth * 0.5;
  const oh = outerHeight * 0.5;
  const fw = faceWidth * 0.5;
  const fh = faceHeight * 0.5;
  return [
    {
      outerStart: { x: -ow, y: -oh }, outerEnd: { x: ow, y: -oh },
      innerStart: { x: -fw, y: -fh }, innerEnd: { x: fw, y: -fh },
      along: { x: 1, y: 0 }, outward: { x: 0, y: -1 }, sOffset: 0,
    },
    {
      outerStart: { x: ow, y: -oh }, outerEnd: { x: ow, y: oh },
      innerStart: { x: fw, y: -fh }, innerEnd: { x: fw, y: fh },
      along: { x: 0, y: 1 }, outward: { x: 1, y: 0 }, sOffset: outerWidth,
    },
    {
      outerStart: { x: ow, y: oh }, outerEnd: { x: -ow, y: oh },
      innerStart: { x: fw, y: fh }, innerEnd: { x: -fw, y: fh },
      along: { x: -1, y: 0 }, outward: { x: 0, y: 1 }, sOffset: outerWidth + outerHeight,
    },
    {
      outerStart: { x: -ow, y: oh }, outerEnd: { x: -ow, y: -oh },
      innerStart: { x: -fw, y: fh }, innerEnd: { x: -fw, y: -fh },
      along: { x: 0, y: -1 }, outward: { x: -1, y: 0 },
      sOffset: 2 * outerWidth + outerHeight,
    },
  ];
}

interface FrameVertex {
  p: Vec2;
  z: number;
}

class FrameMeshBuilder {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly uvs: number[] = [];

  /** Quad a-b-c-d (CCW seen from the normal side), split into two triangles. */
  addQuad(
    verts: [FrameVertex, FrameVertex, FrameVertex, FrameVertex],
    normal: [number, number, number],
    uvOf: (v: FrameVertex) => [number, number],
  ): void {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      const v = verts[i];
      this.positions.push(v.p.x, v.p.y, v.z);
      this.normals.push(...normal);
      this.uvs.push(...uvOf(v));
    }
  }
}

/**
 * Picture-frame body built from four mitred bars (front at z = 0, back at z = -frameDepth).
 * UVs are in meters per bar: `u` = perimeter arc-length along the bar (grain direction),
 * `v` = cross-bar distance — on caps from the inner edge, on walls wrapped around via depth.
 * Each bar owns its triangles, so the grain turns cleanly at the mitre.
 */
export function createExtrudedFrameGeometry(
  faceWidth: number,
  faceHeight: number,
  frameThickness: number,
  frameDepth: number,
): BufferGeometry {
  const params: FrameGeometryParams = { faceWidth, faceHeight, frameThickness, frameDepth };
  const builder = new FrameMeshBuilder();
  const front = 0;
  const back = -frameDepth;

  for (const bar of buildFrameBars(params)) {
    const alongU = (p: Vec2) =>
      bar.sOffset + (p.x - bar.outerStart.x) * bar.along.x + (p.y - bar.outerStart.y) * bar.along.y;
    const cross = (p: Vec2) =>
      (p.x - bar.innerStart.x) * bar.outward.x + (p.y - bar.innerStart.y) * bar.outward.y;

    const capUv = (v: FrameVertex): [number, number] => [alongU(v.p), cross(v.p)];
    const outerWallUv = (v: FrameVertex): [number, number] => [alongU(v.p), frameThickness - v.z];
    const innerWallUv = (v: FrameVertex): [number, number] => [alongU(v.p), v.z];

    const { outerStart: o0, outerEnd: o1, innerStart: i0, innerEnd: i1, outward } = bar;

    builder.addQuad(
      [{ p: o0, z: front }, { p: o1, z: front }, { p: i1, z: front }, { p: i0, z: front }],
      [0, 0, 1],
      capUv,
    );
    builder.addQuad(
      [{ p: o0, z: back }, { p: i0, z: back }, { p: i1, z: back }, { p: o1, z: back }],
      [0, 0, -1],
      capUv,
    );
    builder.addQuad(
      [{ p: o0, z: back }, { p: o1, z: back }, { p: o1, z: front }, { p: o0, z: front }],
      [outward.x, outward.y, 0],
      outerWallUv,
    );
    builder.addQuad(
      [{ p: i1, z: back }, { p: i0, z: back }, { p: i0, z: front }, { p: i1, z: front }],
      [-outward.x, -outward.y, 0],
      innerWallUv,
    );
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(builder.positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(builder.normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(builder.uvs, 2));
  ensureGeometryTangents(geometry);
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
  ensureGeometryTangents(geometry);
  return geometry;
}
