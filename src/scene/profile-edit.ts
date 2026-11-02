import type { ProfileNode, ProfilePath, ProfileVec2 } from './profile-model';

/** Pure edit operations on profile paths; every function returns a new path. */

const MIN_HANDLE_MM = 1e-6;

function replaceNode(path: ProfilePath, index: number, node: ProfileNode): ProfilePath {
  const nodes = [...path.nodes];
  nodes[index] = node;
  return { ...path, nodes };
}

function length(v: ProfileVec2): number {
  return Math.hypot(v.x, v.y);
}

export function moveNode(path: ProfilePath, index: number, x: number, y: number): ProfilePath {
  return replaceNode(path, index, { ...path.nodes[index], x, y });
}

export type HandleSide = 'in' | 'out';

/**
 * Sets one handle (relative offset). For `smooth` nodes the opposite handle turns to stay
 * opposite and keeps its own length; `breakSymmetry` (Shift) turns the node into a corner.
 */
export function setHandle(
  path: ProfilePath,
  index: number,
  side: HandleSide,
  offset: ProfileVec2,
  breakSymmetry = false,
): ProfilePath {
  const node = path.nodes[index];
  const key = side === 'in' ? 'handleIn' : 'handleOut';
  const otherKey = side === 'in' ? 'handleOut' : 'handleIn';
  const next: ProfileNode = { ...node, [key]: offset };
  if (breakSymmetry) {
    next.mode = 'corner';
  } else if (node.mode === 'smooth') {
    const other = node[otherKey];
    const len = length(offset);
    if (other && len > MIN_HANDLE_MM) {
      const otherLen = length(other);
      next[otherKey] = { x: (-offset.x / len) * otherLen, y: (-offset.y / len) * otherLen };
    }
  }
  return replaceNode(path, index, next);
}

/** Handle as length (mm) and angle (degrees, 0 = +x, counter-clockwise on screen). */
export function handlePolar(handle: ProfileVec2): { length: number; angleDeg: number } {
  return {
    length: length(handle),
    angleDeg: (Math.atan2(-handle.y, handle.x) * 180) / Math.PI,
  };
}

export function handleFromPolar(lengthMm: number, angleDeg: number): ProfileVec2 {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad) * lengthMm, y: -Math.sin(rad) * lengthMm };
}

function neighbour(path: ProfilePath, index: number, step: -1 | 1): ProfileNode | null {
  const count = path.nodes.length;
  const next = index + step;
  if (next >= 0 && next < count) {return path.nodes[next];}
  return path.closed && count > 1 ? path.nodes[(next + count) % count] : null;
}

/** Corner → smooth adds handles along the neighbours; smooth → corner removes them. */
export function toggleNodeMode(path: ProfilePath, index: number): ProfilePath {
  const node = path.nodes[index];
  if (node.mode === 'smooth') {
    const { handleIn: _in, handleOut: _out, ...rest } = node;
    return replaceNode(path, index, { ...rest, mode: 'corner' });
  }
  const prev = neighbour(path, index, -1) ?? node;
  const next = neighbour(path, index, 1) ?? node;
  let dir = { x: next.x - prev.x, y: next.y - prev.y };
  let len = length(dir);
  if (len < MIN_HANDLE_MM) {
    dir = { x: 1, y: 0 };
    len = 1;
  }
  const unit = { x: dir.x / len, y: dir.y / len };
  const lenIn = Math.max(length({ x: node.x - prev.x, y: node.y - prev.y }) / 3, 1);
  const lenOut = Math.max(length({ x: next.x - node.x, y: next.y - node.y }) / 3, 1);
  const { radius: _radius, ...rest } = node;
  return replaceNode(path, index, {
    ...rest,
    mode: 'smooth',
    handleIn: { x: -unit.x * lenIn, y: -unit.y * lenIn },
    handleOut: { x: unit.x * lenOut, y: unit.y * lenOut },
  });
}

export const MIN_PATH_NODES = 2;

export function deleteNode(path: ProfilePath, index: number): ProfilePath {
  if (path.nodes.length <= MIN_PATH_NODES) {return path;}
  const nodes = path.nodes.filter((_node, i) => i !== index);
  return { ...path, nodes, closed: path.closed && nodes.length > 2 };
}

/** Index of the end node of segment `segment` (start node index). */
export function segmentEndIndex(path: ProfilePath, segment: number): number {
  return (segment + 1) % path.nodes.length;
}

export function segmentCount(path: ProfilePath): number {
  const n = path.nodes.length;
  return path.closed && n > 2 ? n : Math.max(0, n - 1);
}

/** Cubic control points of a segment in absolute mm. */
export function segmentControlPoints(
  path: ProfilePath,
  segment: number,
): [ProfileVec2, ProfileVec2, ProfileVec2, ProfileVec2] {
  const a = path.nodes[segment];
  const b = path.nodes[segmentEndIndex(path, segment)];
  const c1 = a.handleOut ? { x: a.x + a.handleOut.x, y: a.y + a.handleOut.y } : { x: a.x, y: a.y };
  const c2 = b.handleIn ? { x: b.x + b.handleIn.x, y: b.y + b.handleIn.y } : { x: b.x, y: b.y };
  return [{ x: a.x, y: a.y }, c1, c2, { x: b.x, y: b.y }];
}

const lerp = (a: ProfileVec2, b: ProfileVec2, t: number): ProfileVec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export function pointOnSegment(path: ProfilePath, segment: number, t: number): ProfileVec2 {
  const [p0, p1, p2, p3] = segmentControlPoints(path, segment);
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const c = lerp(p2, p3, t);
  return lerp(lerp(a, b, t), lerp(b, c, t), t);
}

/** Closest parameter t on a segment to `point` (sampled, then refined). */
export function closestTOnSegment(path: ProfilePath, segment: number, point: ProfileVec2): number {
  const dist = (t: number) => {
    const p = pointOnSegment(path, segment, t);
    return (p.x - point.x) ** 2 + (p.y - point.y) ** 2;
  };
  const samples = 64;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const d = dist(t);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  let step = 1 / samples;
  for (let i = 0; i < 20; i++) {
    step /= 2;
    for (const t of [best - step, best + step]) {
      if (t >= 0 && t <= 1 && dist(t) < bestDist) {
        bestDist = dist(t);
        best = t;
      }
    }
  }
  return best;
}

/**
 * Inserts a node at parameter t of a segment without changing the shape
 * (de Casteljau split). Straight segments stay straight. Returns the new path and index.
 */
export function insertNode(
  path: ProfilePath,
  segment: number,
  t: number,
): { path: ProfilePath; index: number } {
  const endIndex = segmentEndIndex(path, segment);
  const a = path.nodes[segment];
  const b = path.nodes[endIndex];
  const straight = !a.handleOut && !b.handleIn;
  const [p0, p1, p2, p3] = segmentControlPoints(path, segment);
  const q0 = lerp(p0, p1, t);
  const q1 = lerp(p1, p2, t);
  const q2 = lerp(p2, p3, t);
  const r0 = lerp(q0, q1, t);
  const r1 = lerp(q1, q2, t);
  const s = lerp(r0, r1, t);

  const newNode: ProfileNode = straight
    ? { x: s.x, y: s.y, mode: 'corner' }
    : {
        x: s.x,
        y: s.y,
        mode: 'smooth',
        handleIn: { x: r0.x - s.x, y: r0.y - s.y },
        handleOut: { x: r1.x - s.x, y: r1.y - s.y },
      };
  const nodes = [...path.nodes];
  if (!straight) {
    nodes[segment] = a.handleOut ? { ...a, handleOut: { x: q0.x - a.x, y: q0.y - a.y } } : a;
    nodes[endIndex] = b.handleIn ? { ...b, handleIn: { x: q2.x - b.x, y: q2.y - b.y } } : b;
  }
  const insertAt = segment + 1;
  nodes.splice(insertAt, 0, newNode);
  return { path: { ...path, nodes }, index: insertAt };
}

/** Profiles hold up to ten paths, one per colour slot. */
export const PROFILE_SLOT_COUNT = 10;

export function nextFreeSlot(paths: readonly ProfilePath[]): number | null {
  const used = new Set(paths.map((path) => path.slot));
  for (let slot = 0; slot < PROFILE_SLOT_COUNT; slot++) {
    if (!used.has(slot)) {return slot;}
  }
  return null;
}

function uniquePathId(paths: readonly ProfilePath[]): string {
  let n = paths.length + 1;
  while (paths.some((path) => path.id === `path-${n}`)) {n += 1;}
  return `path-${n}`;
}

function uniquePathName(paths: readonly ProfilePath[], base: string): string {
  const names = new Set(paths.map((path) => path.name));
  if (!names.has(base)) {return base;}
  let n = 2;
  while (names.has(`${base} ${n}`)) {n += 1;}
  return `${base} ${n}`;
}

/**
 * Adds a closed 20 × 20 mm square path in the next free slot, placed right of the
 * existing paths. Returns null when all slots are used.
 */
export function addSquarePath(paths: readonly ProfilePath[]): ProfilePath[] | null {
  const slot = nextFreeSlot(paths);
  if (slot === null) {return null;}
  const maxX = paths.reduce(
    (max, path) => path.nodes.reduce((m, node) => Math.max(m, node.x), max),
    0,
  );
  const x = paths.length > 0 ? maxX + 10 : 0;
  const size = 20;
  const path: ProfilePath = {
    id: uniquePathId(paths),
    name: uniquePathName(paths, `Path ${paths.length + 1}`),
    slot,
    closed: true,
    nodes: [
      { x, y: 0, mode: 'corner' },
      { x: x + size, y: 0, mode: 'corner' },
      { x: x + size, y: size, mode: 'corner' },
      { x, y: size, mode: 'corner' },
    ],
  };
  return [...paths, path];
}

export function removePath(paths: readonly ProfilePath[], pathId: string): ProfilePath[] {
  return paths.filter((path) => path.id !== pathId);
}

/** Moves a path to `slot`; a path already in that slot takes the old slot (swap). */
export function setPathSlot(
  paths: readonly ProfilePath[],
  pathId: string,
  slot: number,
): ProfilePath[] {
  const moving = paths.find((path) => path.id === pathId);
  if (!moving || moving.slot === slot || slot < 0 || slot >= PROFILE_SLOT_COUNT) {
    return [...paths];
  }
  return paths.map((path) => {
    if (path.id === pathId) {return { ...path, slot };}
    if (path.slot === slot) {return { ...path, slot: moving.slot };}
    return path;
  });
}
