import type { ProfilePath, ProfileVec2 } from './profile-model';

/** How a path takes part in an extrusion. */
export type ExtrusionPathRole =
  | { kind: 'solid'; overlaps: boolean }
  | { kind: 'hole'; parentId: string }
  | { kind: 'shell' };

export type PathSampler = (path: ProfilePath) => readonly ProfileVec2[];

function pointInPolygon(point: ProfileVec2, polygon: readonly ProfileVec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function segmentsCross(p1: ProfileVec2, p2: ProfileVec2, q1: ProfileVec2, q2: ProfileVec2): boolean {
  const cross = (a: ProfileVec2, b: ProfileVec2, c: ProfileVec2) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = cross(q1, q2, p1);
  const d2 = cross(q1, q2, p2);
  const d3 = cross(p1, p2, q1);
  const d4 = cross(p1, p2, q2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function edgesCross(a: readonly ProfileVec2[], b: readonly ProfileVec2[]): boolean {
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      if (segmentsCross(a1, a2, b[j], b[(j + 1) % b.length])) {return true;}
    }
  }
  return false;
}

/** True when `inner` lies completely inside `outer` (no edge crossings). */
export function polygonContains(outer: readonly ProfileVec2[], inner: readonly ProfileVec2[]): boolean {
  if (outer.length < 3 || inner.length < 3) {return false;}
  return inner.every((point) => pointInPolygon(point, outer)) && !edgesCross(outer, inner);
}

/**
 * Classifies the paths of an extrusion (even-odd nesting, like Illustrator):
 * closed paths at even depth are solids, at odd depth holes in their direct container.
 * Open paths are shells. Paths with `cutHole === false` stay solids and do not count
 * for the nesting of others. Partly overlapping closed paths stay solids (`overlaps`).
 */
export function classifyExtrusionPaths(
  paths: readonly ProfilePath[],
  sample: PathSampler,
): Map<string, ExtrusionPathRole> {
  const roles = new Map<string, ExtrusionPathRole>();
  const closed = paths.filter((path) => path.closed && path.nodes.length >= 3);
  const polygons = new Map(closed.map((path) => [path.id, sample(path)]));
  const nesting = closed.filter((path) => path.cutHole !== false);

  const containersOf = (path: ProfilePath) =>
    nesting.filter((other) => other.id !== path.id
      && polygonContains(polygons.get(other.id) ?? [], polygons.get(path.id) ?? []));
  const depth = new Map(nesting.map((path) => [path.id, containersOf(path).length]));

  for (const path of paths) {
    if (!path.closed || path.nodes.length < 3) {
      roles.set(path.id, { kind: 'shell' });
      continue;
    }
    const own = polygons.get(path.id) ?? [];
    const overlaps = closed.some((other) => other.id !== path.id
      && edgesCross(own, polygons.get(other.id) ?? []));
    const d = depth.get(path.id);
    if (path.cutHole === false || d === undefined || d % 2 === 0) {
      roles.set(path.id, { kind: 'solid', overlaps });
      continue;
    }
    // Direct container = the deepest one.
    const parent = containersOf(path).reduce((best, other) =>
      (depth.get(other.id) ?? 0) > (depth.get(best.id) ?? 0) ? other : best);
    roles.set(path.id, { kind: 'hole', parentId: parent.id });
  }
  return roles;
}
