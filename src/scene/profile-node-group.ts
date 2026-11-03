import type { ProfileNode, ProfilePath, ProfileVec2 } from './profile-model';
import { deleteNode, moveNode, type PathPoint } from './profile-edit';

/** Multi-selection of 2D editor nodes: the active node (inspector) plus extra nodes. */
export interface NodeGroupSelection {
  active: PathPoint | null;
  extras: PathPoint[];
}

export function samePoint(a: PathPoint, b: PathPoint): boolean {
  return a.pathId === b.pathId && a.index === b.index;
}

/** All selected nodes, active first. */
export function groupNodes(selection: NodeGroupSelection): PathPoint[] {
  return selection.active ? [selection.active, ...selection.extras] : [...selection.extras];
}

/**
 * Shift-click: adds `point` (it becomes the active node) or removes it when already
 * selected (the most recent extra becomes active).
 */
export function toggleGroupNode(selection: NodeGroupSelection, point: PathPoint): NodeGroupSelection {
  const { active, extras } = selection;
  if (active && samePoint(active, point)) {
    return { active: extras.at(-1) ?? null, extras: extras.slice(0, -1) };
  }
  if (extras.some((entry) => samePoint(entry, point))) {
    return { active, extras: extras.filter((entry) => !samePoint(entry, point)) };
  }
  return { active: point, extras: active ? [...extras, active] : extras };
}

export interface NodeStart extends PathPoint {
  x: number;
  y: number;
}

/** Start positions of the selected nodes that exist in `paths`. */
export function nodeStarts(paths: readonly ProfilePath[], points: readonly PathPoint[]): NodeStart[] {
  return points.flatMap((point) => {
    const node = paths.find((path) => path.id === point.pathId)?.nodes[point.index];
    return node ? [{ ...point, x: node.x, y: node.y }] : [];
  });
}

/** Moves every node to its start position plus `delta` (handles are relative and follow). */
export function moveNodeGroup(
  paths: readonly ProfilePath[],
  starts: readonly NodeStart[],
  delta: ProfileVec2,
): ProfilePath[] {
  return paths.map((path) =>
    starts.reduce(
      (current, start) =>
        start.pathId === path.id && start.index < current.nodes.length
          ? moveNode(current, start.index, start.x + delta.x, start.y + delta.y)
          : current,
      path,
    ),
  );
}

/** Deletes the given nodes (paths keep their minimum node count). */
export function deleteNodeGroup(paths: readonly ProfilePath[], points: readonly PathPoint[]): ProfilePath[] {
  return paths.map((path) => {
    const indices = [...new Set(points.filter((p) => p.pathId === path.id).map((p) => p.index))]
      .sort((a, b) => b - a);
    return indices.reduce((current, index) => deleteNode(current, index), path);
  });
}

/** 2D affine map: x' = a·x + c·y + tx, y' = b·x + d·y + ty. */
export interface Affine2 {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export function scaleAbout(pivot: ProfileVec2, sx: number, sy: number): Affine2 {
  return { a: sx, b: 0, c: 0, d: sy, tx: pivot.x * (1 - sx), ty: pivot.y * (1 - sy) };
}

export function rotateAbout(pivot: ProfileVec2, angle: number): Affine2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    a: cos, b: sin, c: -sin, d: cos,
    tx: pivot.x - cos * pivot.x + sin * pivot.y,
    ty: pivot.y - sin * pivot.x - cos * pivot.y,
  };
}

function applyPoint(m: Affine2, p: ProfileVec2): ProfileVec2 {
  return { x: m.a * p.x + m.c * p.y + m.tx, y: m.b * p.x + m.d * p.y + m.ty };
}

function applyVector(m: Affine2, v: ProfileVec2): ProfileVec2 {
  return { x: m.a * v.x + m.c * v.y, y: m.b * v.x + m.d * v.y };
}

/** A selected node as it was when a box drag started. */
export interface NodeSnapshot extends PathPoint {
  node: ProfileNode;
}

export function nodeSnapshots(paths: readonly ProfilePath[], points: readonly PathPoint[]): NodeSnapshot[] {
  return points.flatMap((point) => {
    const node = paths.find((path) => path.id === point.pathId)?.nodes[point.index];
    return node ? [{ ...point, node }] : [];
  });
}

/** Applies `m` to the snapshot nodes (positions and their relative handles). */
export function transformNodeGroup(
  paths: readonly ProfilePath[],
  snapshots: readonly NodeSnapshot[],
  m: Affine2,
): ProfilePath[] {
  return paths.map((path) => {
    const own = snapshots.filter((snap) => snap.pathId === path.id && snap.index < path.nodes.length);
    if (own.length === 0) {return path;}
    const nodes = [...path.nodes];
    for (const { index, node } of own) {
      const { x, y } = applyPoint(m, node);
      const next: ProfileNode = { ...node, x, y };
      if (node.handleIn) {next.handleIn = applyVector(m, node.handleIn);}
      if (node.handleOut) {next.handleOut = applyVector(m, node.handleOut);}
      nodes[index] = next;
    }
    return { ...path, nodes };
  });
}

export interface GroupBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Bounding box of the selected node positions, or null when nothing exists. */
export function groupBounds(paths: readonly ProfilePath[], points: readonly PathPoint[]): GroupBounds | null {
  const starts = nodeStarts(paths, points);
  if (starts.length === 0) {return null;}
  return {
    minX: Math.min(...starts.map((p) => p.x)),
    minY: Math.min(...starts.map((p) => p.y)),
    maxX: Math.max(...starts.map((p) => p.x)),
    maxY: Math.max(...starts.map((p) => p.y)),
  };
}
