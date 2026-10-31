import { type BufferGeometry, Vector3 } from 'three/webgpu';
import {
  getPatchEdgeCount,
  getPatchEdgePoints,
  type PatchParams,
  type PatchPoint,
} from '@/scene/asset-triangle-patch';
import type { Vec3 } from '@/scene/entity-types';
import { crossHandleKeyAt, type PatchEdgeLink } from '@/scene/triangle-patch-edge-link';
import { evalPatchSurfacePoint } from './triangle-patch-geometry';
import { evalQuadPatchSurfacePoint } from './quad-patch-geometry';

/**
 * Classic patch surface with a correction strip along linked edges.
 *
 * The classic surface keeps its shape; only near linked edge segments with smooth joints
 * its slope across the edge is turned (around the edge) into the direction of the cross
 * handles. Those handles are coupled with the partner patch (smooth joints), so both
 * patches leave the shared edge in one tangent plane: no crease. Steps:
 *
 * - K(t): slope of the classic surface across the edge (numerical).
 * - D(t): K turned around the edge axis until its across-part points to the target
 *   direction (cross handles of the segment ends, interpolated on the sphere). Length and
 *   along-part stay, so the classic shape is kept.
 * - S = S_classic + sum_i W_i * d_i * f(d_i) * sigma_i(t) * (D_i - K_i)
 *   d_i keeps the edge position, f fades out over the strip width, W_i is 1 on edge i and
 *   0 (with zero slope) on all other edges, sigma is 1 at smooth and 0 at corner joints.
 *
 * Unlinked patches get no correction and evaluate exactly like the classic surface.
 */

/** Default width of the correction strip (share of the patch). */
export const DEFAULT_EDGE_BLEND = 0.3;
export const MIN_EDGE_BLEND = 0.1;
export const MAX_EDGE_BLEND = 0.6;

const FD_STEP = 1e-5;

/** Per-edge (parameter along the edge, distance from the edge) for a domain point. */
export interface EdgeCoordinate {
  t: number;
  d: number;
}

interface CorrectedSegment {
  /** Edge parameter range of the segment. */
  t0: number;
  t1: number;
  /** Strength at both ends: 1 = smooth joint, 0 = corner joint. */
  sigma0: number;
  sigma1: number;
  /** Target across-direction (unit) at both ends, in patch space. */
  dir0: Vector3;
  dir1: Vector3;
}

export interface PreparedEdgeCorrection {
  sides: number;
  /** Corrected segments per edge (empty when the edge is not linked). */
  edges: CorrectedSegment[][];
  blend: number;
  classic: (coords: readonly EdgeCoordinate[], out: Vector3) => Vector3;
  /** Domain point of (t, d) on edge i. */
  fromEdge: (edge: number, t: number, d: number) => EdgeCoordinate[];
}

function sub(a: Vec3, b: Vec3): Vector3 {
  return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Edge parameter of every point on the edge (same clamping as locatePatchEdgeSegment). */
function edgeKnots(params: PatchParams, edgeIndex: number): { point: PatchPoint; t: number }[] {
  const points = getPatchEdgePoints(params, edgeIndex);
  const last = points.length - 1;
  let prev = 0;
  return points.map((point, k) => {
    if (k === 0) {return { point, t: 0 };}
    if (k === last) {return { point, t: 1 };}
    prev = Math.min(1, Math.max(prev, params.edgeParams[point.id] ?? k / last));
    return { point, t: prev };
  });
}

// --- Domain mappings -----------------------------------------------------------------

function triangleCoords(u: number, v: number, w: number): EdgeCoordinate[] {
  const ratio = (a: number, b: number) => (a + b > 1e-14 ? b / (a + b) : 0);
  return [
    { t: ratio(u, v), d: w },
    { t: ratio(v, w), d: u },
    { t: ratio(w, u), d: v },
  ];
}

function triangleFromEdge(edge: number, t: number, d: number): [number, number, number] {
  const a = (1 - d) * (1 - t);
  const b = (1 - d) * t;
  if (edge === 0) {return [a, b, d];}
  if (edge === 1) {return [d, a, b];}
  return [b, d, a];
}

function quadCoords(s: number, t: number): EdgeCoordinate[] {
  return [
    { t: s, d: t },
    { t, d: 1 - s },
    { t: 1 - s, d: 1 - t },
    { t: 1 - t, d: s },
  ];
}

function quadFromEdge(edge: number, t: number, d: number): [number, number] {
  if (edge === 0) {return [t, d];}
  if (edge === 1) {return [1 - d, t];}
  if (edge === 2) {return [1 - t, 1 - d];}
  return [d, 1 - t];
}

// --- Preparation ---------------------------------------------------------------------

/** Unit across-direction of a point's cross handle (relative to the edge axis there). */
function acrossDirection(
  params: PatchParams,
  point: PatchPoint,
  segment: { startPointId: string; endPointId: string },
  linkCount: number,
  intoSegment: 'handleNext' | 'handlePrev',
): Vector3 | null {
  const key = crossHandleKeyAt(params, point.id, segment, linkCount);
  if (!key) {return null;}
  const axis = key === 'handleCrossIn'
    ? sub(point.handleNext, point.handlePrev)
    : sub(point[intoSegment], point.pos);
  if (axis.lengthSq() < 1e-20) {return null;}
  axis.normalize();
  const handle = sub(point[key], point.pos);
  const across = handle.addScaledVector(axis, -handle.dot(axis));
  return across.lengthSq() > 1e-20 ? across.normalize() : null;
}

/** Prepares the correction, or returns null when the patch has no linked edges. */
export function prepareEdgeCorrection(params: PatchParams): PreparedEdgeCorrection | null {
  const links = params.edgeLinks ?? [];
  if (links.length === 0) {return null;}
  const sides = getPatchEdgeCount(params);
  const quad = sides === 4;
  const linksAt = (id: string) => links.filter((l) => l.startPointId === id || l.endPointId === id).length;
  const isLinked = (a: string, b: string) => links.some((l: PatchEdgeLink) =>
    (l.startPointId === a && l.endPointId === b) || (l.startPointId === b && l.endPointId === a));

  const edges: CorrectedSegment[][] = [];
  let any = false;
  for (let e = 0; e < sides; e++) {
    const knots = edgeKnots(params, e);
    const segments: CorrectedSegment[] = [];
    for (let k = 0; k + 1 < knots.length; k++) {
      const a = knots[k].point;
      const b = knots[k + 1].point;
      if (!isLinked(a.id, b.id)) {continue;}
      const segment = { startPointId: a.id, endPointId: b.id };
      const dir0 = acrossDirection(params, a, segment, linksAt(a.id), 'handleNext');
      const dir1 = acrossDirection(params, b, segment, linksAt(b.id), 'handlePrev');
      const sigma0 = a.joint === 'smooth' && dir0 ? 1 : 0;
      const sigma1 = b.joint === 'smooth' && dir1 ? 1 : 0;
      if (sigma0 === 0 && sigma1 === 0) {continue;}
      segments.push({
        t0: knots[k].t,
        t1: knots[k + 1].t,
        sigma0,
        sigma1,
        dir0: dir0 ?? dir1 ?? new Vector3(),
        dir1: dir1 ?? dir0 ?? new Vector3(),
      });
      any = true;
    }
    edges.push(segments);
  }
  if (!any) {return null;}

  const blend = Math.min(MAX_EDGE_BLEND, Math.max(MIN_EDGE_BLEND, params.edgeBlend ?? DEFAULT_EDGE_BLEND));
  return {
    sides,
    edges,
    blend,
    classic: quad
      ? (coords, out) => evalQuadPatchSurfacePoint(params, coords[0].t, coords[0].d, out)
      : (coords, out) => {
        // Recover barycentrics from edge 0 / edge 1 distances: w = d0, u = d1, v = rest.
        const w = coords[0].d;
        const u = coords[1].d;
        return evalPatchSurfacePoint(params, u, 1 - u - w, w, out);
      },
    fromEdge: quad
      ? (edge, t, d) => { const [s, tt] = quadFromEdge(edge, t, d); return quadCoords(s, tt); }
      : (edge, t, d) => { const [u, v, w] = triangleFromEdge(edge, t, d); return triangleCoords(u, v, w); },
  };
}

// --- Evaluation ----------------------------------------------------------------------

const _k = new Vector3();
const _axis = new Vector3();
const _p0 = new Vector3();
const _p1 = new Vector3();
const _dir = new Vector3();

function slerpUnit(a: Vector3, b: Vector3, s: number, out: Vector3): Vector3 {
  const angle = Math.acos(Math.min(1, Math.max(-1, a.dot(b))));
  if (angle < 1e-9 || Math.PI - angle < 1e-3) {
    return out.copy(a).multiplyScalar(1 - s).addScaledVector(b, s).normalize();
  }
  const sinA = Math.sin(angle);
  return out.copy(a).multiplyScalar(Math.sin((1 - s) * angle) / sinA).addScaledVector(b, Math.sin(s * angle) / sinA);
}

/**
 * Correction vector sigma * (D - K) on edge `edge` at parameter t, or null outside
 * corrected segments. Writes the target slope D into `targetOut` when given.
 */
export function evalEdgeSlopeCorrection(
  prepared: PreparedEdgeCorrection,
  edge: number,
  t: number,
  out: Vector3,
  targetOut?: Vector3,
): Vector3 | null {
  const segment = prepared.edges[edge].find((seg) => t >= seg.t0 - 1e-12 && t <= seg.t1 + 1e-12);
  if (!segment) {return null;}
  const span = segment.t1 - segment.t0;
  const s = span > 1e-12 ? Math.min(1, Math.max(0, (t - segment.t0) / span)) : 0;
  const sigma = segment.sigma0 * (1 - s) + segment.sigma1 * s;

  // Classic slope across the edge, and the edge axis (both numerical).
  // Second-order one-sided difference (the surface only exists on the inner side).
  prepared.classic(prepared.fromEdge(edge, t, 0), _p0);
  prepared.classic(prepared.fromEdge(edge, t, FD_STEP), _p1);
  prepared.classic(prepared.fromEdge(edge, t, 2 * FD_STEP), _k);
  _k.multiplyScalar(-1).addScaledVector(_p1, 4).addScaledVector(_p0, -3).multiplyScalar(1 / (2 * FD_STEP));
  const ta = Math.max(0, t - FD_STEP);
  const tb = Math.min(1, t + FD_STEP);
  prepared.classic(prepared.fromEdge(edge, tb, 0), _p1);
  prepared.classic(prepared.fromEdge(edge, ta, 0), _axis);
  _axis.subVectors(_p1, _axis);
  if (_axis.lengthSq() < 1e-24) {return null;}
  _axis.normalize();

  const along = _k.dot(_axis);
  const acrossLength = Math.sqrt(Math.max(0, _k.lengthSq() - along * along));
  slerpUnit(segment.dir0, segment.dir1, s, _dir);
  _dir.addScaledVector(_axis, -_dir.dot(_axis));
  if (_dir.lengthSq() < 1e-20 || acrossLength < 1e-12) {return null;}
  _dir.normalize();

  // D = K turned around the axis: same along-part, same across-length, target direction.
  const target = targetOut ?? new Vector3();
  target.copy(_axis).multiplyScalar(along).addScaledVector(_dir, acrossLength);
  return out.copy(target).sub(_k).multiplyScalar(sigma);
}

const _corr = new Vector3();

/** Fade over the strip: 1 with zero slope at the edge, 0 with zero slope at the strip end. */
function fade(d: number, width: number): number {
  if (d >= width) {return 0;}
  const x = Math.max(0, d) / width;
  return 1 - x * x * (3 - 2 * x);
}

/** Classic surface plus the edge correction, for per-edge domain coordinates. */
export function evalEdgeCorrectedSurface(
  prepared: PreparedEdgeCorrection,
  coords: readonly EdgeCoordinate[],
  out = new Vector3(),
): Vector3 {
  prepared.classic(coords, out);
  const n = prepared.sides;
  let weightSum = 0;
  const weights: number[] = [];
  for (let i = 0; i < n; i++) {
    let w = 1;
    for (let j = 0; j < n; j++) {if (j !== i) {w *= coords[j].d * coords[j].d;}}
    weights.push(w);
    weightSum += w;
  }
  if (weightSum < 1e-300) {return out;} // exactly on a corner
  for (let i = 0; i < n; i++) {
    const { t, d } = coords[i];
    const f = fade(d, prepared.blend);
    if (f === 0 || weights[i] === 0 || prepared.edges[i].length === 0) {continue;}
    if (!evalEdgeSlopeCorrection(prepared, i, t, _corr)) {continue;}
    out.addScaledVector(_corr, (weights[i] / weightSum) * d * f);
  }
  return out;
}

export { triangleCoords as triangleEdgeCoordinates, quadCoords as quadEdgeCoordinates };

// --- Mesh ----------------------------------------------------------------------------

const _target = new Vector3();
const _slope = new Vector3();
const _tan = new Vector3();
const _q0 = new Vector3();
const _q1 = new Vector3();

/**
 * Exact surface normal on edge `edge` at t (edge tangent x corrected slope), or null when
 * the point is not on a corrected segment.
 */
export function evalCorrectedBoundaryNormal(
  prepared: PreparedEdgeCorrection,
  edge: number,
  t: number,
  out: Vector3,
): Vector3 | null {
  if (!evalEdgeSlopeCorrection(prepared, edge, t, _corr, _target)) {return null;}
  // Slope actually built: K + sigma (D - K) = classic slope + correction.
  prepared.classic(prepared.fromEdge(edge, t, 0), _q0);
  prepared.classic(prepared.fromEdge(edge, t, FD_STEP), _q1);
  prepared.classic(prepared.fromEdge(edge, t, 2 * FD_STEP), _slope);
  _slope.multiplyScalar(-1).addScaledVector(_q1, 4).addScaledVector(_q0, -3).multiplyScalar(1 / (2 * FD_STEP));
  _slope.add(_corr);
  const ta = Math.max(0, t - FD_STEP);
  const tb = Math.min(1, t + FD_STEP);
  prepared.classic(prepared.fromEdge(edge, tb, 0), _q1);
  prepared.classic(prepared.fromEdge(edge, ta, 0), _tan);
  _tan.subVectors(_q1, _tan);
  out.copy(_tan).cross(_slope);
  return out.lengthSq() > 1e-24 ? out.normalize() : null;
}

const _pos = new Vector3();
const _normal = new Vector3();
const _ref = new Vector3();

/**
 * Applies the linked-edge correction to a classic patch mesh in place (positions from the
 * mesh UVs: triangle (u, v), quad (s, t)), then rebuilds normals and tangents. Boundary
 * vertices of corrected segments get the exact normal so linked patches shade seamlessly.
 */
export function applyEdgeCorrectionToGeometry(geometry: BufferGeometry, prepared: PreparedEdgeCorrection): void {
  const quad = prepared.sides === 4;
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  const coordsOf = (i: number): EdgeCoordinate[] => {
    const a = uv.getX(i);
    const b = uv.getY(i);
    return quad ? quadCoords(a, b) : triangleCoords(a, b, Math.max(0, 1 - a - b));
  };
  for (let i = 0; i < position.count; i++) {
    evalEdgeCorrectedSurface(prepared, coordsOf(i), _pos);
    position.setXYZ(i, _pos.x, _pos.y, _pos.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();

  const normal = geometry.getAttribute('normal');
  for (let i = 0; i < position.count; i++) {
    const coords = coordsOf(i);
    // UVs are float32: a boundary vertex can be ~1e-8 off the edge.
    const onEdges = coords.map((c, e) => (Math.abs(c.d) < 1e-6 ? e : -1)).filter((e) => e >= 0);
    if (onEdges.length !== 1) {continue;} // inside, or a corner
    const edge = onEdges[0];
    if (!evalCorrectedBoundaryNormal(prepared, edge, coords[edge].t, _normal)) {continue;}
    _ref.set(normal.getX(i), normal.getY(i), normal.getZ(i));
    if (_normal.dot(_ref) < 0) {_normal.negate();}
    normal.setXYZ(i, _normal.x, _normal.y, _normal.z);
  }
  normal.needsUpdate = true;
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  geometry.computeTangents();
  geometry.getAttribute('tangent').needsUpdate = true;
}
