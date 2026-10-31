import type { AssetKind } from './asset-kind';
import type { Vec3 } from './entity-types';
import type { PatchEdgeLink } from './triangle-patch-edge-link';

/** One control point on the patch boundary: anchor plus four tangent handles. */
export interface PatchPoint {
  /** Stable id; selection and edge params refer to it, never to the list index. */
  id: string;
  name: string;
  pos: Vec3;
  handleNext: Vec3;
  handlePrev: Vec3;
  handleCrossIn: Vec3;
  handleCrossOut: Vec3;
  /**
   * Joint with the partner patch at a point on a linked edge: 'smooth' couples the cross
   * handles of both patches (no crease), 'corner' leaves them free. Absent = corner.
   */
  joint?: PatchJoint;
  /**
   * Edge switch: 'smooth' keeps both pink handles on one line (the boundary runs through
   * the point without a kink, lengths free), 'corner' leaves them free. Absent: derived
   * from the handles (see resolveEdgeTangent).
   */
  edgeTangent?: PatchJoint;
}

export type PatchJoint = 'smooth' | 'corner';

export type PatchHandleTarget =
  | 'pos'
  | 'handleNext'
  | 'handlePrev'
  | 'handleCrossIn'
  | 'handleCrossOut';

/** The patch control point (anchor or handle) currently picked for editing. */
export interface PatchHandleSelection {
  entityId: string;
  pointId: string;
  targetKey: PatchHandleTarget;
}

export interface PatchParams {
  divisions: number;
  /** Closed loop around the patch boundary; the order is also the panel list order. */
  points: PatchPoint[];
  /** Corner points in loop order: three for a triangle patch, four for a quad patch. Edge e runs corner e -> corner e+1. */
  cornerIds: string[];
  /** Edge parameter t in (0, 1) of every non-corner point on its edge. */
  edgeParams: Record<string, number>;
  /** Live mirror copies across the local YZ / XZ / XY planes through the pivot; absent means none. */
  mirror?: PatchMirror;
  /**
   * @deprecated Former surface switch ('smooth-edges'); ignored. Kept so stored scenes load.
   * Linked edges are now smoothed by the edge correction (see edgeBlend).
   */
  surface?: PatchSurfaceMode;
  /** Width of the smoothing strip along linked edges (share of the patch, 0.1–0.6); absent = 0.3. */
  edgeBlend?: number;
  /** Edge segments linked to another patch (stored on both sides); absent means none. */
  edgeLinks?: PatchEdgeLink[];
}

export type PatchSurfaceMode = 'classic' | 'smooth-edges';

/** Which local axes the patch is mirrored across (x flips X across the YZ plane, and so on). */
export interface PatchMirror {
  x: boolean;
  y: boolean;
  z: boolean;
}

/**
 * Scale sign vectors of every mirror copy, excluding the original (1, 1, 1).
 * All sign combinations of the enabled axes, so X+Z also yields the diagonal (-1, 1, -1).
 */
export function getPatchMirrorSigns(mirror: PatchMirror | undefined): Vec3[] {
  if (!mirror) {return [];}
  const xs = mirror.x ? [1, -1] : [1];
  const ys = mirror.y ? [1, -1] : [1];
  const zs = mirror.z ? [1, -1] : [1];
  const signs: Vec3[] = [];
  for (const y of ys) {
    for (const z of zs) {
      for (const x of xs) {
        if (x === 1 && y === 1 && z === 1) {continue;}
        signs.push({ x, y, z });
      }
    }
  }
  return signs;
}

export type PatchAssetKind = 'triangle-patch' | 'quad-patch';

/** Triangle and quad patches share params, gizmo, add-point mode and panel. */
export function isPatchAssetKind(kind: AssetKind): kind is PatchAssetKind {
  return kind === 'triangle-patch' || kind === 'quad-patch';
}

export function isQuadPatchParams(params: PatchParams): boolean {
  return params.cornerIds.length === 4;
}

export function clonePatchPoint(point: PatchPoint): PatchPoint {
  return {
    id: point.id,
    name: point.name,
    pos: { ...point.pos },
    handleNext: { ...point.handleNext },
    handlePrev: { ...point.handlePrev },
    handleCrossIn: { ...point.handleCrossIn },
    handleCrossOut: { ...point.handleCrossOut },
    ...(point.joint ? { joint: point.joint } : {}),
    ...(point.edgeTangent ? { edgeTangent: point.edgeTangent } : {}),
  };
}

export function clonePatchParams(params: PatchParams): PatchParams {
  return {
    divisions: params.divisions,
    points: params.points.map(clonePatchPoint),
    cornerIds: [...params.cornerIds],
    edgeParams: { ...params.edgeParams },
    ...(params.mirror ? { mirror: { ...params.mirror } } : {}),
    ...(params.edgeBlend !== undefined ? { edgeBlend: params.edgeBlend } : {}),
    ...(params.edgeLinks ? { edgeLinks: params.edgeLinks.map((link) => ({ ...link })) } : {}),
  };
}

export function findPatchPoint(params: PatchParams, pointId: string): PatchPoint | undefined {
  return params.points.find((point) => point.id === pointId);
}

export function isPatchCorner(params: PatchParams, pointId: string): boolean {
  return params.cornerIds.includes(pointId);
}

export function getPatchCorners(params: PatchParams): PatchPoint[] {
  return params.cornerIds.map((id) => {
    const point = findPatchPoint(params, id);
    if (!point) {throw new Error(`patch corner ${id} is missing`);}
    return point;
  });
}

/** Number of edges (= corners) of the patch. */
export function getPatchEdgeCount(params: PatchParams): number {
  return params.cornerIds.length;
}

/** Points of edge `edgeIndex` in loop order, from its start corner to its end corner inclusive. */
export function getPatchEdgePoints(params: PatchParams, edgeIndex: number): PatchPoint[] {
  const { points, cornerIds } = params;
  const startId = cornerIds[edgeIndex % cornerIds.length];
  const endId = cornerIds[(edgeIndex + 1) % cornerIds.length];
  const startIdx = points.findIndex((point) => point.id === startId);
  if (startIdx < 0) {throw new Error(`patch corner ${startId} is missing`);}

  const edge: PatchPoint[] = [];
  for (let step = 0; step < points.length; step++) {
    const point = points[(startIdx + step) % points.length];
    edge.push(point);
    if (step > 0 && point.id === endId) {return edge;}
  }
  throw new Error(`patch corner ${endId} is missing`);
}

export interface PatchEdgeSegment {
  start: PatchPoint;
  end: PatchPoint;
  /** Local parameter in [0, 1] inside the segment. */
  s: number;
}

/**
 * Finds the segment of edge `edgeIndex` that holds edge parameter `t`. Edge points sit at
 * their `edgeParams` value; out-of-order params are clamped so the knots stay monotonic.
 */
export function locatePatchEdgeSegment(
  params: PatchParams,
  edgeIndex: number,
  t: number,
): PatchEdgeSegment {
  const points = getPatchEdgePoints(params, edgeIndex);
  const last = points.length - 1;
  const clampedT = Math.max(0, Math.min(1, t));
  let knotStart = 0;
  for (let k = 0; k < last; k++) {
    const rawEnd = k + 1 === last ? 1 : params.edgeParams[points[k + 1].id] ?? (k + 1) / last;
    const knotEnd = Math.min(1, Math.max(knotStart, rawEnd));
    if (clampedT <= knotEnd || k + 1 === last) {
      const span = knotEnd - knotStart;
      const s = span > 1e-9 ? Math.min(1, Math.max(0, (clampedT - knotStart) / span)) : 0;
      return { start: points[k], end: points[k + 1], s };
    }
    knotStart = knotEnd;
  }
  throw new Error('patch edge has no segment');
}

/** Returns a new point list with the point of the same id swapped in. */
export function replacePatchPoint(points: readonly PatchPoint[], next: PatchPoint): PatchPoint[] {
  return points.map((point) => (point.id === next.id ? next : point));
}

/** Shrinks the authored default handles so a freshly placed patch is only gently curved. */
const DEFAULT_HANDLE_LENGTH_SCALE = 0.5;

const POINT_HANDLE_KEYS = ['handleNext', 'handlePrev', 'handleCrossIn', 'handleCrossOut'] as const;

/** Scales every tangent handle's offset from its anchor by `factor`. */
export function scalePatchPointHandles(point: PatchPoint, factor: number): PatchPoint {
  const next = clonePatchPoint(point);
  for (const key of POINT_HANDLE_KEYS) {
    next[key] = {
      x: point.pos.x + (point[key].x - point.pos.x) * factor,
      y: point.pos.y + (point[key].y - point.pos.y) * factor,
      z: point.pos.z + (point[key].z - point.pos.z) * factor,
    };
  }
  return next;
}

/**
 * Default initial geometry for a triangle patch: three corner points, no edge points.
 */
export function defaultTrianglePatchParams(): PatchParams {
  const points = authoredCornerPoints().map((point) =>
    scalePatchPointHandles(point, DEFAULT_HANDLE_LENGTH_SCALE),
  );
  return {
    divisions: 24,
    points,
    cornerIds: [points[0].id, points[1].id, points[2].id],
    edgeParams: {},
  };
}

function authoredCornerPoints(): PatchPoint[] {
  return [
    {
      id: 'pt-1',
      name: 'Point 1',
      pos: { x: 0.0, y: 0.22, z: 0.5 },
      handleNext: { x: 0.0, y: 0.34, z: 0.05 },
      handlePrev: { x: 0.35, y: 0.3, z: 0.3 },
      handleCrossIn: { x: 0.25, y: 0.4, z: 0.35 },
      handleCrossOut: { x: -0.25, y: 0.04, z: 0.65 },
    },
    {
      id: 'pt-2',
      name: 'Point 2',
      pos: { x: 0.0, y: 0.48, z: -0.5 },
      handleNext: { x: 0.32, y: 0.42, z: -0.25 },
      handlePrev: { x: 0.0, y: 0.38, z: -0.05 },
      handleCrossIn: { x: 0.2, y: 0.63, z: -0.38 },
      handleCrossOut: { x: -0.2, y: 0.33, z: -0.62 },
    },
    {
      id: 'pt-3',
      name: 'Point 3',
      pos: { x: 0.6, y: 0.28, z: 0.0 },
      handleNext: { x: 0.28, y: 0.24, z: 0.25 },
      handlePrev: { x: 0.25, y: 0.34, z: -0.25 },
      handleCrossIn: { x: 0.35, y: 0.5, z: 0.0 },
      handleCrossOut: { x: 0.85, y: 0.06, z: 0.0 },
    },
  ];
}


/**
 * Default initial geometry for a quad patch: four corner points on a 1 x 1 square,
 * handles at a third of each edge, cross handles lifting the middle gently.
 */
export function defaultQuadPatchParams(): PatchParams {
  const y = 0.3;
  const half = 0.5;
  const third = 1 / 3;
  const lift = 0.15;
  const corners: [number, number][] = [
    [-half, half],
    [half, half],
    [half, -half],
    [-half, -half],
  ];
  const points: PatchPoint[] = corners.map(([x, z], index) => {
    const [nx, nz] = corners[(index + 1) % 4];
    const [px, pz] = corners[(index + 3) % 4];
    return {
      id: `pt-${index + 1}`,
      name: `Point ${index + 1}`,
      pos: { x, y, z },
      handleNext: { x: x + (nx - x) * third, y, z: z + (nz - z) * third },
      handlePrev: { x: x + (px - x) * third, y, z: z + (pz - z) * third },
      handleCrossIn: { x: x * (1 - third), y: y + lift, z: z * (1 - third) },
      handleCrossOut: { x: x * (1 + third), y: y - lift, z: z * (1 + third) },
    };
  });
  return {
    divisions: 24,
    points,
    cornerIds: points.map((point) => point.id),
    edgeParams: {},
  };
}

export function defaultPatchParamsForKind(kind: PatchAssetKind): PatchParams {
  return kind === 'quad-patch' ? defaultQuadPatchParams() : defaultTrianglePatchParams();
}
