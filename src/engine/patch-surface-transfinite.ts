import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three/webgpu';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';
import {
  getPatchCorners,
  getPatchEdgeCount,
  getPatchEdgePoints,
  type PatchParams,
  type PatchPoint,
} from '@/scene/asset-triangle-patch';

/**
 * "Smooth Edges" patch surface: transfinite interpolation of edge ribbons (Kato blend).
 *
 * Each edge i carries a ribbon R_i(s, d) = C_i(s) + d * D_i(s): the edge curve plus the
 * cross-boundary derivative D_i. The surface blends the ribbons with weights
 * w_i = prod_{j != i} d_j^2, so on edge i it equals the curve AND leaves it with exactly the
 * direction of D_i. Two patches whose D are opposite along a shared edge therefore meet
 * without a crease (tangent-plane continuity), independent of their size and shape.
 *
 * D_i along an edge:
 * - at edge points (non-corners): 3 * (handleCrossIn - pos) (the yellow handle),
 * - at corners: forced by the neighboring edge (its pink handle), the only choice that
 *   keeps the surface consistent at the corner,
 * - in between: direction interpolated on the sphere, length linearly. Opposite handles
 *   on two patches thus stay opposite along the whole segment, whatever their lengths.
 *
 * The yellow corner handles drive a center bulge that vanishes with zero slope on the
 * boundary, so it never disturbs the edges.
 */

/** Center bulge strength; matches the classic surface's bulge at the patch center. */
const BULGE_STRENGTH = 0.65;
/** Bezier convention: a handle is a third of the derivative it encodes. */
const HANDLE_TO_DERIVATIVE = 3;

interface EdgeKnot {
  point: PatchPoint;
  /** Edge parameter of the point in [0, 1]. */
  t: number;
}

/** Points of an edge with monotonic edge parameters (same rules as locatePatchEdgeSegment). */
function edgeKnots(params: PatchParams, edgeIndex: number): EdgeKnot[] {
  const points = getPatchEdgePoints(params, edgeIndex);
  const last = points.length - 1;
  const knots: EdgeKnot[] = [{ point: points[0], t: 0 }];
  let prev = 0;
  for (let k = 1; k < last; k++) {
    const raw = params.edgeParams[points[k].id] ?? k / last;
    prev = Math.min(1, Math.max(prev, raw));
    knots.push({ point: points[k], t: prev });
  }
  knots.push({ point: points[last], t: 1 });
  return knots;
}

/** Precomputed edge data so a full mesh evaluates without repeated lookups. */
interface PreparedEdge {
  knots: EdgeKnot[];
  /** Cross derivative D at every knot. */
  cross: Vector3[];
  /** Part of D perpendicular to the edge tangent at every knot (decides the tangent plane). */
  crossPerp: Vector3[];
  /** Part of D along the unit edge tangent at every knot (scalar). */
  crossAlong: number[];
}

export interface PreparedTransfiniteSurface {
  edges: PreparedEdge[];
  bulge: Vector3;
  corners: Vector3[];
  sides: number;
}

function sub(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Locates edge parameter t: segment index k and local s. */
function locate(knots: EdgeKnot[], t: number): { k: number; s: number; span: number } {
  const clamped = Math.min(1, Math.max(0, t));
  const last = knots.length - 1;
  for (let k = 0; k < last; k++) {
    if (clamped <= knots[k + 1].t || k + 1 === last) {
      const span = knots[k + 1].t - knots[k].t;
      const s = span > 1e-12 ? Math.min(1, Math.max(0, (clamped - knots[k].t) / span)) : 0;
      return { k, s, span };
    }
  }
  return { k: last - 1, s: 1, span: knots[last].t - knots[last - 1].t };
}

function bezier(a: PatchPoint, b: PatchPoint, s: number, out: Vector3): Vector3 {
  const m = 1 - s;
  const c0 = m * m * m;
  const c1 = 3 * m * m * s;
  const c2 = 3 * m * s * s;
  const c3 = s * s * s;
  out.set(
    c0 * a.pos.x + c1 * a.handleNext.x + c2 * b.handlePrev.x + c3 * b.pos.x,
    c0 * a.pos.y + c1 * a.handleNext.y + c2 * b.handlePrev.y + c3 * b.pos.y,
    c0 * a.pos.z + c1 * a.handleNext.z + c2 * b.handlePrev.z + c3 * b.pos.z,
  );
  return out;
}

/** d/ds of the segment Bezier (local parameter). */
function bezierDerivative(a: PatchPoint, b: PatchPoint, s: number, out: Vector3): Vector3 {
  const m = 1 - s;
  const k0 = 3 * m * m;
  const k1 = 6 * m * s;
  const k2 = 3 * s * s;
  out.set(
    k0 * (a.handleNext.x - a.pos.x) + k1 * (b.handlePrev.x - a.handleNext.x) + k2 * (b.pos.x - b.handlePrev.x),
    k0 * (a.handleNext.y - a.pos.y) + k1 * (b.handlePrev.y - a.handleNext.y) + k2 * (b.pos.y - b.handlePrev.y),
    k0 * (a.handleNext.z - a.pos.z) + k1 * (b.handlePrev.z - a.handleNext.z) + k2 * (b.pos.z - b.handlePrev.z),
  );
  return out;
}

/** Edge curve C_i(t). */
export function evalPreparedEdge(edge: PreparedEdge, t: number, out = new Vector3()): Vector3 {
  const { k, s } = locate(edge.knots, t);
  return bezier(edge.knots[k].point, edge.knots[k + 1].point, s, out);
}

/** Edge tangent dC_i/dt (per unit edge parameter). */
export function evalPreparedEdgeTangent(edge: PreparedEdge, t: number, out = new Vector3()): Vector3 {
  const { k, s, span } = locate(edge.knots, t);
  bezierDerivative(edge.knots[k].point, edge.knots[k + 1].point, s, out);
  return span > 1e-12 ? out.multiplyScalar(1 / span) : out;
}

const _da = new Vector3();
const _db = new Vector3();
const _tan = new Vector3();

/** Sphere interpolation of direction, linear interpolation of length. */
function slerpVectors(a: Vector3, b: Vector3, s: number, out: Vector3): Vector3 {
  const la = a.length();
  const lb = b.length();
  if (la < 1e-12 || lb < 1e-12) {
    return out.copy(a).multiplyScalar(1 - s).addScaledVector(b, s);
  }
  _da.copy(a).multiplyScalar(1 / la);
  _db.copy(b).multiplyScalar(1 / lb);
  const angle = Math.acos(Math.min(1, Math.max(-1, _da.dot(_db))));
  const length = la * (1 - s) + lb * s;
  if (angle < 1e-9) {return out.copy(_da).multiplyScalar(length);}
  if (Math.PI - angle < 1e-3) {
    return out.copy(a).multiplyScalar(1 - s).addScaledVector(b, s);
  }
  const sinA = Math.sin(angle);
  const wa = Math.sin((1 - s) * angle) / sinA;
  const wb = Math.sin(s * angle) / sinA;
  return out.copy(_da).multiplyScalar(wa).addScaledVector(_db, wb).multiplyScalar(length);
}

/**
 * Cross derivative D_i(t). Only its part perpendicular to the edge decides the tangent
 * plane, so that part is interpolated on the sphere (opposite inputs stay opposite on two
 * linked patches); the part along the edge is interpolated as a scalar and re-added.
 */
export function evalPreparedCross(edge: PreparedEdge, t: number, out = new Vector3()): Vector3 {
  const { k, s } = locate(edge.knots, t);
  slerpVectors(edge.crossPerp[k], edge.crossPerp[k + 1], s, out);
  const along = edge.crossAlong[k] * (1 - s) + edge.crossAlong[k + 1] * s;
  evalPreparedEdgeTangent(edge, t, _tan);
  const len = _tan.length();
  if (len > 1e-12) {out.addScaledVector(_tan, along / len);}
  return out;
}

export function prepareTransfiniteSurface(params: PatchParams): PreparedTransfiniteSurface {
  const sides = getPatchEdgeCount(params);
  const allKnots = Array.from({ length: sides }, (_, e) => edgeKnots(params, e));
  const edges: PreparedEdge[] = allKnots.map((knots, e) => {
    const prevKnots = allKnots[(e - 1 + sides) % sides];
    const nextKnots = allKnots[(e + 1) % sides];
    const cross = knots.map(({ point }, i) => {
      if (i === 0) {
        // Start corner: away from this edge = back along the previous edge.
        const span = 1 - prevKnots[prevKnots.length - 2].t;
        return sub(point.handlePrev, point.pos).multiplyScalar(HANDLE_TO_DERIVATIVE / Math.max(span, 1e-12));
      }
      if (i === knots.length - 1) {
        // End corner: away from this edge = along the next edge.
        const span = nextKnots[1].t;
        return sub(point.handleNext, point.pos).multiplyScalar(HANDLE_TO_DERIVATIVE / Math.max(span, 1e-12));
      }
      return sub(point.handleCrossIn, point.pos).multiplyScalar(HANDLE_TO_DERIVATIVE);
    });
    const crossPerp: Vector3[] = [];
    const crossAlong: number[] = [];
    const partial = { knots, cross, crossPerp, crossAlong };
    knots.forEach(({ t }, i) => {
      const tangent = evalPreparedEdgeTangent(partial, t);
      const len = tangent.length();
      const unit = len > 1e-12 ? tangent.multiplyScalar(1 / len) : new Vector3();
      const along = cross[i].dot(unit);
      crossAlong.push(along);
      crossPerp.push(cross[i].clone().addScaledVector(unit, -along));
    });
    return partial;
  });

  const corners = getPatchCorners(params);
  const bulge = new Vector3();
  for (const corner of corners) {bulge.add(sub(corner.handleCrossIn, corner.pos));}
  bulge.multiplyScalar(BULGE_STRENGTH / corners.length);

  return { edges, bulge, corners: corners.map((c) => new Vector3(c.pos.x, c.pos.y, c.pos.z)), sides };
}

/** Per-edge (parameter along the edge, distance from the edge) for a domain point. */
export interface EdgeCoordinate {
  t: number;
  d: number;
}

/** Triangle domain from barycentric (u, v, w) weighting corners 0, 1, 2. */
export function triangleEdgeCoordinates(u: number, v: number, w: number): EdgeCoordinate[] {
  const ratio = (a: number, b: number) => (a + b > 1e-14 ? b / (a + b) : 0);
  return [
    { t: ratio(u, v), d: w },
    { t: ratio(v, w), d: u },
    { t: ratio(w, u), d: v },
  ];
}

/** Quad domain (s, t) in [0, 1]^2, corners at (0,0), (1,0), (1,1), (0,1). */
export function quadEdgeCoordinates(s: number, t: number): EdgeCoordinate[] {
  return [
    { t: s, d: t },
    { t, d: 1 - s },
    { t: 1 - s, d: 1 - t },
    { t: 1 - t, d: s },
  ];
}

const _ribbon = new Vector3();
const _cross = new Vector3();

/** Surface point for the given per-edge coordinates (see triangle/quadEdgeCoordinates). */
export function evalTransfiniteSurface(
  surface: PreparedTransfiniteSurface,
  coords: readonly EdgeCoordinate[],
  out = new Vector3(),
): Vector3 {
  const n = surface.sides;
  // Exactly on a corner every weight vanishes: return the corner itself.
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    if (Math.abs(coords[i].d) < 1e-14 && Math.abs(coords[next].d) < 1e-14) {
      return out.copy(surface.corners[next]);
    }
  }

  out.set(0, 0, 0);
  let weightSum = 0;
  let bulgeFactor = 1;
  for (let i = 0; i < n; i++) {
    let weight = 1;
    for (let j = 0; j < n; j++) {
      if (j !== i) {weight *= coords[j].d * coords[j].d;}
    }
    const edge = surface.edges[i];
    const { t, d } = coords[i];
    evalPreparedEdge(edge, t, _ribbon).addScaledVector(evalPreparedCross(edge, t, _cross), d);
    out.addScaledVector(_ribbon, weight);
    weightSum += weight;
    bulgeFactor *= d;
  }
  out.multiplyScalar(1 / weightSum);

  // Bulge with zero value and zero slope on the boundary, 1 at the domain center.
  const center = n === 3 ? 27 : 16;
  const b = bulgeFactor * center;
  return out.addScaledVector(surface.bulge, b * b);
}

/**
 * Exact surface normal (unnormalized orientation: tangent x cross) on edge `edgeIndex` at t:
 * the boundary tangent plane is spanned by the edge tangent and D.
 */
export function evalTransfiniteBoundaryNormal(
  surface: PreparedTransfiniteSurface,
  edgeIndex: number,
  t: number,
  out = new Vector3(),
): Vector3 {
  const edge = surface.edges[edgeIndex];
  evalPreparedEdgeTangent(edge, t, out);
  return out.cross(evalPreparedCross(edge, t, _cross)).normalize();
}

// --- Mesh building -----------------------------------------------------------------

const _p = new Vector3();
const _a = new Vector3();
const _b = new Vector3();
const _n = new Vector3();
const _ref = new Vector3();

/**
 * Replaces the mesh normals with analytic ones: exact (edge tangent x cross derivative) on
 * the boundary so linked patches shade seamlessly, finite differences of the surface inside.
 * Each normal keeps the orientation of the triangle-averaged normal (front face).
 */
function applyAnalyticNormals(
  geometry: BufferGeometry,
  analytic: (index: number, out: Vector3) => boolean,
): void {
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal');
  for (let i = 0; i < normals.count; i++) {
    if (!analytic(i, _n) || _n.lengthSq() < 1e-20) {continue;}
    _n.normalize();
    _ref.set(normals.getX(i), normals.getY(i), normals.getZ(i));
    if (_n.dot(_ref) < 0) {_n.negate();}
    normals.setXYZ(i, _n.x, _n.y, _n.z);
  }
  normals.needsUpdate = true;
}

/** Triangle patch mesh (same grid, UVs and winding as the classic triangle patch). */
export function buildTransfiniteTriangleGeometry(params: PatchParams): BufferGeometry {
  const surface = prepareTransfiniteSurface(params);
  const divisions = Math.max(2, Math.min(64, params.divisions || 24));
  const evalAt = (u: number, v: number, out: Vector3) =>
    evalTransfiniteSurface(surface, triangleEdgeCoordinates(u, v, 1 - u - v), out);

  const positions: number[] = [];
  const uvs: number[] = [];
  const domain: [number, number][] = [];
  const grid: number[][] = [];
  for (let i = 0; i <= divisions; i++) {
    grid[i] = [];
    for (let j = 0; j <= divisions - i; j++) {
      grid[i][j] = domain.length;
      const u = i / divisions;
      const v = j / divisions;
      evalAt(u, v, _p);
      positions.push(_p.x, _p.y, _p.z);
      uvs.push(u, v);
      domain.push([u, v]);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j < divisions - i; j++) {
      const p1 = grid[i][j];
      const p2 = grid[i + 1][j];
      const p3 = grid[i][j + 1];
      indices.push(p1, p2, p3);
      if (j < divisions - i - 1) {indices.push(p2, grid[i + 1][j + 1], p3);}
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  const h = 1e-4;
  applyAnalyticNormals(geometry, (index, out) => {
    const [u, v] = domain[index];
    const w = 1 - u - v;
    const eps = 1e-9;
    const onEdge0 = w < eps;
    const onEdge1 = u < eps;
    const onEdge2 = v < eps;
    if (Number(onEdge0) + Number(onEdge1) + Number(onEdge2) > 1) {return false;} // corner
    if (onEdge0) {return Boolean(evalTransfiniteBoundaryNormal(surface, 0, v, out));}
    if (onEdge1) {return Boolean(evalTransfiniteBoundaryNormal(surface, 1, w / (v + w), out));}
    if (onEdge2) {return Boolean(evalTransfiniteBoundaryNormal(surface, 2, u / (w + u), out));}
    // Inside: central differences along u and v (w compensates).
    evalAt(u + h, v, _a).sub(evalAt(u - h, v, _b));
    const du = out.copy(_a);
    evalAt(u, v + h, _a).sub(evalAt(u, v - h, _b));
    du.cross(_a);
    return true;
  });
  ensureGeometryTangents(geometry);
  return geometry;
}

/** Quad patch mesh (same grid, UVs and winding as the classic quad patch). */
export function buildTransfiniteQuadGeometry(params: PatchParams): BufferGeometry {
  const surface = prepareTransfiniteSurface(params);
  const divisions = Math.max(2, Math.min(64, params.divisions || 24));
  const row = divisions + 1;
  const evalAt = (s: number, t: number, out: Vector3) =>
    evalTransfiniteSurface(surface, quadEdgeCoordinates(s, t), out);

  const positions = new Float32Array(row * row * 3);
  const uvs = new Float32Array(row * row * 2);
  for (let j = 0; j <= divisions; j++) {
    for (let i = 0; i <= divisions; i++) {
      const index = j * row + i;
      evalAt(i / divisions, j / divisions, _p);
      positions[index * 3] = _p.x;
      positions[index * 3 + 1] = _p.y;
      positions[index * 3 + 2] = _p.z;
      uvs[index * 2] = i / divisions;
      uvs[index * 2 + 1] = j / divisions;
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < divisions; j++) {
    for (let i = 0; i < divisions; i++) {
      const a = j * row + i;
      indices.push(a, a + 1, a + row + 1, a, a + row + 1, a + row);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  const h = 1e-4;
  applyAnalyticNormals(geometry, (index, out) => {
    const i = index % row;
    const j = Math.floor(index / row);
    const s = i / divisions;
    const t = j / divisions;
    const onS0 = i === 0;
    const onS1 = i === divisions;
    const onT0 = j === 0;
    const onT1 = j === divisions;
    if ((onS0 || onS1) && (onT0 || onT1)) {return false;} // corner
    if (onT0) {return Boolean(evalTransfiniteBoundaryNormal(surface, 0, s, out));}
    if (onS1) {return Boolean(evalTransfiniteBoundaryNormal(surface, 1, t, out));}
    if (onT1) {return Boolean(evalTransfiniteBoundaryNormal(surface, 2, 1 - s, out));}
    if (onS0) {return Boolean(evalTransfiniteBoundaryNormal(surface, 3, 1 - t, out));}
    evalAt(s + h, t, _a).sub(evalAt(s - h, t, _b));
    const ds = out.copy(_a);
    evalAt(s, t + h, _a).sub(evalAt(s, t - h, _b));
    ds.cross(_a);
    return true;
  });
  ensureGeometryTangents(geometry);
  return geometry;
}
