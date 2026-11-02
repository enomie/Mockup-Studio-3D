import {
  BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Mesh,
  Shape,
  ShapeUtils,
  Vector2,
  type Material,
} from 'three/webgpu';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import {
  profilePathToSvgData,
  type ProfileBounds,
  type ProfilePath,
} from '@/scene/profile-model';
import { MM_TO_M } from '@/units/length';
import { ensureGeometryTangents } from './geometry-tangents';

/** Curve subdivisions per segment when sampling profile paths. */
const CURVE_DIVISIONS = 24;
const MIN_POINT_GAP_M = 1e-7;

export interface ExtrusionPathMeshInput {
  path: ProfilePath;
  material: Material;
}

export interface ExtrusionBuildInput {
  paths: readonly ExtrusionPathMeshInput[];
  /** Bounds of the whole profile (mm); x is centred and the lowest point sits at y = 0. */
  bounds: ProfileBounds;
  depthM: number;
  sizeScale: number;
}

/** Samples a profile path (incl. rounded corners) in mm, y down. */
export function sampleProfilePathMm(path: ProfilePath): Vector2[] {
  const d = profilePathToSvgData(path);
  if (!d) {return [];}
  const loader = new SVGLoader();
  const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  for (const svgPath of data.paths) {
    const subPath = svgPath.subPaths.at(0);
    if (subPath === undefined) {continue;}
    return subPath.getPoints(CURVE_DIVISIONS).map((p) => new Vector2(p.x, p.y));
  }
  return [];
}

function toMeters(points: Vector2[], bounds: ProfileBounds, scale: number): Vector2[] {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const out: Vector2[] = [];
  for (const point of points) {
    const next = new Vector2(
      (point.x - centerX) * MM_TO_M * scale,
      (bounds.maxY - point.y) * MM_TO_M * scale,
    );
    const last = out.at(-1);
    if (!last || last.distanceTo(next) > MIN_POINT_GAP_M) {out.push(next);}
  }
  return out;
}

/** Closed outline → solid with front and back caps, centred on z. */
function solidGeometry(points: Vector2[], depthM: number): BufferGeometry | null {
  const outline = [...points];
  const first = outline.at(0);
  const last = outline.at(-1);
  if (first && last && first.distanceTo(last) <= MIN_POINT_GAP_M) {outline.pop();}
  if (outline.length < 3) {return null;}
  if (ShapeUtils.isClockWise(outline)) {outline.reverse();}
  const geometry = new ExtrudeGeometry(new Shape(outline), {
    depth: depthM,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(0, 0, -depthM / 2);
  return geometry;
}

/** Open polyline → single surface (no volume) swept along z. */
function shellGeometry(points: Vector2[], depthM: number): BufferGeometry | null {
  if (points.length < 2) {return null;}
  const half = depthM / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  let length = 0;
  points.forEach((point, i) => {
    if (i > 0) {length += point.distanceTo(points[i - 1]);}
    positions.push(point.x, point.y, -half, point.x, point.y, half);
    uvs.push(length, 0, length, 1);
  });
  const indices: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** One mesh per profile path: closed paths become solids, open paths shells. */
export function buildExtrusionMeshes(input: ExtrusionBuildInput): Mesh[] {
  const meshes: Mesh[] = [];
  for (const { path, material } of input.paths) {
    const points = toMeters(sampleProfilePathMm(path), input.bounds, input.sizeScale);
    const depthM = input.depthM * input.sizeScale;
    const geometry = path.closed ? solidGeometry(points, depthM) : shellGeometry(points, depthM);
    if (!geometry) {continue;}
    ensureGeometryTangents(geometry);
    if (!path.closed) {material.side = DoubleSide;}
    const mesh = new Mesh(geometry, material);
    mesh.name = `extrusion-path-${path.slot}`;
    mesh.userData.role = `path${path.slot}`;
    meshes.push(mesh);
  }
  return meshes;
}
