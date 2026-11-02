import {
  BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Mesh,
  Path,
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

export interface ExtrusionHoleInput {
  path: ProfilePath;
  /** Material of the hole wall (defaults to the body material in the caller). */
  wallMaterial: Material;
}

export interface ExtrusionPathMeshInput {
  path: ProfilePath;
  material: Material;
  /** Closed paths directly inside this solid that cut holes. */
  holes?: readonly ExtrusionHoleInput[];
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

function closedOutline(points: Vector2[]): Vector2[] {
  const outline = [...points];
  const first = outline.at(0);
  const last = outline.at(-1);
  if (first && last && first.distanceTo(last) <= MIN_POINT_GAP_M) {outline.pop();}
  return outline;
}

function distanceToPolygon(point: Vector2, polygon: readonly Vector2[]): number {
  let best = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((point.x - a.x) * abx + (point.y - a.y) * aby) / len2)) : 0;
    best = Math.min(best, Math.hypot(point.x - (a.x + abx * t), point.y - (a.y + aby * t)));
  }
  return best;
}

/**
 * ExtrudeGeometry puts all side walls (outline and holes) into one group. This splits the
 * walls so each hole wall can get its own material: group 0 = caps and outline walls
 * (material 0), group i + 1 = walls of hole i (material i + 1).
 */
function splitHoleWalls(
  geometry: BufferGeometry,
  outline: readonly Vector2[],
  holes: readonly (readonly Vector2[])[],
): BufferGeometry {
  const position = geometry.getAttribute('position');
  const sideGroup = geometry.groups.find((group) => group.materialIndex === 1);
  if (!sideGroup || holes.length === 0) {return geometry;}
  const buckets: number[][] = [[], ...holes.map(() => [])];
  const centroid = new Vector2();
  for (let v = 0; v < sideGroup.start; v += 3) {buckets[0].push(v);}
  for (let v = sideGroup.start; v < sideGroup.start + sideGroup.count; v += 3) {
    centroid.set(
      (position.getX(v) + position.getX(v + 1) + position.getX(v + 2)) / 3,
      (position.getY(v) + position.getY(v + 1) + position.getY(v + 2)) / 3,
    );
    let bucket = 0;
    let best = distanceToPolygon(centroid, outline);
    holes.forEach((hole, i) => {
      const d = distanceToPolygon(centroid, hole);
      if (d < best) {
        best = d;
        bucket = i + 1;
      }
    });
    buckets[bucket].push(v);
  }
  const names = Object.keys(geometry.attributes);
  const out = new BufferGeometry();
  const order = buckets.flat();
  for (const name of names) {
    const attribute = geometry.getAttribute(name);
    const size = attribute.itemSize;
    const data = new Float32Array(order.length * 3 * size);
    let k = 0;
    for (const start of order) {
      for (let corner = 0; corner < 3; corner++) {
        for (let c = 0; c < size; c++) {data[k++] = attribute.getComponent(start + corner, c);}
      }
    }
    out.setAttribute(name, new Float32BufferAttribute(data, size));
  }
  let start = 0;
  buckets.forEach((bucket, i) => {
    out.addGroup(start, bucket.length * 3, i);
    start += bucket.length * 3;
  });
  geometry.dispose();
  return out;
}

/** Closed outline (with optional holes) → solid with front and back caps, centred on z. */
function solidGeometry(
  points: Vector2[],
  depthM: number,
  holes: readonly Vector2[][] = [],
): BufferGeometry | null {
  const outline = closedOutline(points);
  if (outline.length < 3) {return null;}
  if (ShapeUtils.isClockWise(outline)) {outline.reverse();}
  const shape = new Shape(outline);
  const holeOutlines = holes.map(closedOutline).filter((hole) => hole.length >= 3);
  for (const hole of holeOutlines) {
    shape.holes.push(new Path(ShapeUtils.isClockWise(hole) ? hole : [...hole].reverse()));
  }
  let geometry: BufferGeometry = new ExtrudeGeometry(shape, {
    depth: depthM,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(0, 0, -depthM / 2);
  if (holeOutlines.length > 0) {
    geometry = splitHoleWalls(geometry, outline, holeOutlines);
  }
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
  for (const { path, material, holes = [] } of input.paths) {
    const points = toMeters(sampleProfilePathMm(path), input.bounds, input.sizeScale);
    const depthM = input.depthM * input.sizeScale;
    const holePoints = holes.map((hole) =>
      toMeters(sampleProfilePathMm(hole.path), input.bounds, input.sizeScale));
    const geometry = path.closed
      ? solidGeometry(points, depthM, holePoints)
      : shellGeometry(points, depthM);
    if (!geometry) {continue;}
    ensureGeometryTangents(geometry);
    if (!path.closed) {material.side = DoubleSide;}
    // With holes the geometry has one group per hole wall; otherwise one material for all.
    const materials = holes.length > 0
      ? [material, ...holes.map((hole) => hole.wallMaterial)]
      : material;
    const mesh = new Mesh(geometry, materials);
    mesh.name = `extrusion-path-${path.slot}`;
    mesh.userData.role = `path${path.slot}`;
    meshes.push(mesh);
  }
  return meshes;
}
