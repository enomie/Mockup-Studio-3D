import type { ProfilePath, ProfileVec2 } from './profile-model';
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
