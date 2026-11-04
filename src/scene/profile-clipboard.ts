import type { ProfilePath, ProfileVec2 } from './profile-model';
import {
  MIN_PATH_NODES,
  nextFreeSlot,
  removePath,
  uniquePathId,
  type PathPoint,
} from './profile-edit';
import { deleteNodeGroup } from './profile-node-group';
import { nextCopyName } from './entity-copy';

/** Copied pieces of the 2D editor: whole paths or open runs of consecutive nodes. */
export type ProfileClipboardFragment = ProfilePath;

function sortedIndices(points: readonly PathPoint[], pathId: string): number[] {
  return [...new Set(points.filter((p) => p.pathId === pathId).map((p) => p.index))].sort((a, b) => a - b);
}

/** Splits sorted node indices into runs of consecutive nodes (wrapping on closed paths). */
function consecutiveRuns(indices: readonly number[], count: number, closed: boolean): number[][] {
  const runs: number[][] = [];
  for (const index of indices) {
    const last = runs.at(-1);
    if (last?.at(-1) === index - 1) {last.push(index);} else {runs.push([index]);}
  }
  if (closed && runs.length > 1) {
    const first = runs[0];
    const last = runs[runs.length - 1];
    if (first[0] === 0 && last.at(-1) === count - 1) {
      runs[0] = [...last, ...first];
      runs.pop();
    }
  }
  return runs;
}

/**
 * What Ctrl/Cmd+C takes from the editor: fully selected paths whole (closed stays closed),
 * partly selected paths as open runs of two or more consecutive nodes. `pathOnlyId`: a path
 * selected without nodes is copied whole. Single loose nodes are skipped.
 */
export function copyProfileSelection(
  paths: readonly ProfilePath[],
  points: readonly PathPoint[],
  pathOnlyId: string | null = null,
): ProfileClipboardFragment[] {
  const fragments: ProfileClipboardFragment[] = [];
  for (const path of paths) {
    const indices = sortedIndices(points, path.id);
    if (indices.length === 0) {
      if (path.id === pathOnlyId && points.length === 0) {fragments.push(structuredClone(path));}
      continue;
    }
    if (indices.length === path.nodes.length) {
      fragments.push(structuredClone(path));
      continue;
    }
    for (const run of consecutiveRuns(indices, path.nodes.length, path.closed)) {
      if (run.length < MIN_PATH_NODES) {continue;}
      fragments.push({
        ...structuredClone(path),
        closed: false,
        nodes: run.map((index) => structuredClone(path.nodes[index])),
      });
    }
  }
  return fragments;
}

/**
 * Ctrl/Cmd+X: fully selected paths (or a path selected without nodes) are removed;
 * selected nodes of other paths are deleted like with Del.
 */
export function cutProfileSelection(
  paths: readonly ProfilePath[],
  points: readonly PathPoint[],
  pathOnlyId: string | null = null,
): ProfilePath[] {
  let next = [...paths];
  for (const path of paths) {
    const indices = sortedIndices(points, path.id);
    const whole =
      indices.length === path.nodes.length ||
      (indices.length === 0 && path.id === pathOnlyId && points.length === 0);
    if (whole) {next = removePath(next, path.id);}
  }
  const remaining = new Set(next.map((path) => path.id));
  return deleteNodeGroup(next, points.filter((point) => remaining.has(point.pathId)));
}

export interface ProfilePasteResult {
  paths: ProfilePath[];
  /** Every node of the pasted paths (to select them). */
  pasted: PathPoint[];
  /** Fragments left out because all colour slots are taken. */
  skipped: number;
}

/** Adds the fragments as new paths (fresh id, name and free slot) shifted by `offset` (mm). */
export function pasteProfileFragments(
  paths: readonly ProfilePath[],
  fragments: readonly ProfileClipboardFragment[],
  offset: ProfileVec2,
): ProfilePasteResult {
  let next = [...paths];
  const pasted: PathPoint[] = [];
  let skipped = 0;
  for (const fragment of fragments) {
    const slot = nextFreeSlot(next);
    if (slot === null) {
      skipped += 1;
      continue;
    }
    const path: ProfilePath = {
      ...structuredClone(fragment),
      id: uniquePathId(next),
      name: nextCopyName(fragment.name, next.map((entry) => entry.name)),
      slot,
      nodes: fragment.nodes.map((node) => ({ ...structuredClone(node), x: node.x + offset.x, y: node.y + offset.y })),
    };
    next = [...next, path];
    pasted.push(...path.nodes.map((_node, index) => ({ pathId: path.id, index })));
  }
  return { paths: next, pasted, skipped };
}
