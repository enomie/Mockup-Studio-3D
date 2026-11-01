import type { Curve, Vector2 } from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import type { ProfileNode, ProfilePath, ProfileVec2 } from '@/scene/profile-model';
import {
  lathePathSlotForSvgPath,
  parseLathePathClassStrokeMap,
} from './lathe-svg-path-slots';

const EPSILON_MM = 1e-4;
/** Max sweep per cubic when approximating arcs (radians of the curve parameter). */
const MAX_ARC_SPAN = Math.PI / 4;
const SMOOTH_ANGLE_TOLERANCE = 0.02;

interface CubicSegment {
  p0: ProfileVec2;
  c1: ProfileVec2;
  c2: ProfileVec2;
  p3: ProfileVec2;
}

type Segment = { kind: 'line'; p0: ProfileVec2; p3: ProfileVec2 } | ({ kind: 'cubic' } & CubicSegment);

const vec = (v: Vector2): ProfileVec2 => ({ x: v.x, y: v.y });
const sub = (a: ProfileVec2, b: ProfileVec2): ProfileVec2 => ({ x: a.x - b.x, y: a.y - b.y });
const near = (a: ProfileVec2, b: ProfileVec2): boolean =>
  Math.abs(a.x - b.x) < EPSILON_MM && Math.abs(a.y - b.y) < EPSILON_MM;

/** Approximate any parametric curve by cubic Béziers (Hermite form, small spans). */
function approximateCurve(curve: Curve<Vector2>, spans: number): CubicSegment[] {
  const out: CubicSegment[] = [];
  const h = 1e-5;
  const derivative = (t: number): ProfileVec2 => {
    const a = curve.getPoint(Math.max(0, t - h));
    const b = curve.getPoint(Math.min(1, t + h));
    const dt = Math.min(1, t + h) - Math.max(0, t - h);
    return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
  };
  for (let i = 0; i < spans; i++) {
    const t0 = i / spans;
    const t1 = (i + 1) / spans;
    const k = (t1 - t0) / 3;
    const p0 = vec(curve.getPoint(t0));
    const p3 = vec(curve.getPoint(t1));
    const d0 = derivative(t0);
    const d1 = derivative(t1);
    out.push({
      p0,
      c1: { x: p0.x + d0.x * k, y: p0.y + d0.y * k },
      c2: { x: p3.x - d1.x * k, y: p3.y - d1.y * k },
      p3,
    });
  }
  return out;
}

interface CurveLike extends Curve<Vector2> {
  type: string;
  v0?: Vector2;
  v1?: Vector2;
  v2?: Vector2;
  v3?: Vector2;
  aStartAngle?: number;
  aEndAngle?: number;
}

function curveToSegments(curve: CurveLike): Segment[] {
  if (curve.type === 'LineCurve' && curve.v1 && curve.v2) {
    return [{ kind: 'line', p0: vec(curve.v1), p3: vec(curve.v2) }];
  }
  if (curve.type === 'CubicBezierCurve' && curve.v0 && curve.v1 && curve.v2 && curve.v3) {
    return [{ kind: 'cubic', p0: vec(curve.v0), c1: vec(curve.v1), c2: vec(curve.v2), p3: vec(curve.v3) }];
  }
  if (curve.type === 'QuadraticBezierCurve' && curve.v0 && curve.v1 && curve.v2) {
    // Exact degree elevation.
    const p0 = vec(curve.v0);
    const q = vec(curve.v1);
    const p3 = vec(curve.v2);
    return [{
      kind: 'cubic',
      p0,
      c1: { x: p0.x + (2 / 3) * (q.x - p0.x), y: p0.y + (2 / 3) * (q.y - p0.y) },
      c2: { x: p3.x + (2 / 3) * (q.x - p3.x), y: p3.y + (2 / 3) * (q.y - p3.y) },
      p3,
    }];
  }
  const sweep = Math.abs((curve.aEndAngle ?? 0) - (curve.aStartAngle ?? 0)) || Math.PI * 2;
  const spans = Math.max(1, Math.ceil(sweep / MAX_ARC_SPAN));
  return approximateCurve(curve, spans).map((segment) => ({ kind: 'cubic', ...segment }));
}

function isSmooth(node: ProfileNode): boolean {
  const { handleIn, handleOut } = node;
  if (!handleIn || !handleOut) {
    return false;
  }
  const lenIn = Math.hypot(handleIn.x, handleIn.y);
  const lenOut = Math.hypot(handleOut.x, handleOut.y);
  if (lenIn < EPSILON_MM || lenOut < EPSILON_MM) {
    return false;
  }
  const cross = (handleIn.x * handleOut.y - handleIn.y * handleOut.x) / (lenIn * lenOut);
  const dot = (handleIn.x * handleOut.x + handleIn.y * handleOut.y) / (lenIn * lenOut);
  return dot < 0 && Math.abs(cross) < SMOOTH_ANGLE_TOLERANCE;
}

function handleOrUndefined(handle: ProfileVec2): ProfileVec2 | undefined {
  return Math.hypot(handle.x, handle.y) < EPSILON_MM ? undefined : handle;
}

function segmentsToNodes(segments: Segment[], closedFlag: boolean): { nodes: ProfileNode[]; closed: boolean } {
  const nodes: ProfileNode[] = [];
  for (const segment of segments) {
    const last = nodes.at(-1);
    let start = last;
    if (!start || !near(start, segment.p0)) {
      start = { x: segment.p0.x, y: segment.p0.y, mode: 'corner' };
      nodes.push(start);
    }
    const end: ProfileNode = { x: segment.p3.x, y: segment.p3.y, mode: 'corner' };
    if (segment.kind === 'cubic') {
      const out = handleOrUndefined(sub(segment.c1, segment.p0));
      const inn = handleOrUndefined(sub(segment.c2, segment.p3));
      if (out) {start.handleOut = out;}
      if (inn) {end.handleIn = inn;}
    }
    nodes.push(end);
  }

  let closed = closedFlag;
  const first = nodes.at(0);
  const lastNode = nodes.at(-1);
  if (first && lastNode && nodes.length > 2 && near(first, lastNode)) {
    // Merge the duplicated start/end node; the closing segment is implied.
    if (lastNode.handleIn) {first.handleIn = lastNode.handleIn;}
    nodes.pop();
    closed = true;
  }

  for (const node of nodes) {
    node.mode = isSmooth(node) ? 'smooth' : 'corner';
  }
  return { nodes, closed };
}

/**
 * Convert a lathe SVG (1 unit = 1 mm) into named profile paths.
 * Only slot paths count (first path per slot wins, like the asset loaders).
 */
export function importProfilePathsFromSvg(
  svgText: string,
  pathNameForSlot: (slot: number) => string,
): ProfilePath[] {
  const data = new SVGLoader().parse(svgText);
  const classStroke = parseLathePathClassStrokeMap(svgText);
  const seen = new Set<number>();
  const paths: ProfilePath[] = [];

  for (const svgPath of data.paths) {
    const slot = lathePathSlotForSvgPath(svgPath, classStroke);
    if (slot === null || seen.has(slot)) {
      continue;
    }
    const subPath = svgPath.subPaths.at(0);
    if (!subPath) {
      continue;
    }
    if (svgPath.subPaths.length > 1) {
      throw new Error(`Slot ${slot}: only one subpath per profile path is supported`);
    }
    seen.add(slot);
    const segments = (subPath.curves as CurveLike[]).flatMap(curveToSegments);
    const { nodes, closed } = segmentsToNodes(segments, subPath.autoClose);
    paths.push({ id: `slot-${slot}`, name: pathNameForSlot(slot), slot, closed, nodes });
  }

  return paths.sort((a, b) => a.slot - b.slot);
}
