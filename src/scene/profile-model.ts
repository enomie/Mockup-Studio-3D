import {
  LATHE_PATH_SLOT_CLASSES,
  LATHE_PATH_SLOT_STROKES,
} from '@/engine/lathe-svg-path-slots';

/** 2D vector in millimetres. Handles are stored relative to their node. */
export interface ProfileVec2 {
  x: number;
  y: number;
}

/**
 * One editable point of a profile path.
 * A missing handle means the adjacent segment leaves the node as a straight line.
 */
export interface ProfileNode {
  x: number;
  y: number;
  handleIn?: ProfileVec2;
  handleOut?: ProfileVec2;
  /** `smooth` keeps the two handles opposite each other; `corner` lets them move freely. */
  mode: 'corner' | 'smooth';
  /** Parametric corner rounding in mm; applies between two straight segments only. */
  radius?: number;
}

export interface ProfilePath {
  id: string;
  /** Display name, e.g. "Glass" or "Cork"; later shown in the asset details. */
  name: string;
  /** Colour slot 0–9 (path_red, path_green, …); bridge to the existing lathe assets. */
  slot: number;
  closed: boolean;
  nodes: ProfileNode[];
}

/** A profile is a neutral set of named paths; assets decide whether to revolve or extrude. */
export interface Profile {
  id: string;
  name: string;
  source: 'builtin' | 'user';
  paths: ProfilePath[];
}

const round = (value: number): number => {
  const r = Math.round(value * 10000) / 10000;
  return r === 0 ? 0 : r;
};

/** Copy of the paths with all numbers rounded to 0.0001 mm (stable generated data). */
export function roundProfilePaths(paths: ProfilePath[]): ProfilePath[] {
  return JSON.parse(
    JSON.stringify(paths, (_key, value: unknown) => (typeof value === 'number' ? round(value) : value)),
  ) as ProfilePath[];
}

const fmt = (point: ProfileVec2): string => `${round(point.x)},${round(point.y)}`;

interface FilletCorner {
  /** Where the incoming straight segment ends. */
  entry: ProfileVec2;
  /** Where the outgoing straight segment starts. */
  exit: ProfileVec2;
  c1: ProfileVec2;
  c2: ProfileVec2;
}

const neighbourIndex = (path: ProfilePath, index: number, step: -1 | 1): number | null => {
  const count = path.nodes.length;
  const next = index + step;
  if (next >= 0 && next < count) {return next;}
  return path.closed && count > 2 ? (next + count) % count : null;
};

/**
 * Rounded corner of a node with `radius`, approximated by one cubic Bézier.
 * Only applies between two straight segments; returns null otherwise.
 */
export function filletCorner(path: ProfilePath, index: number): FilletCorner | null {
  const node = path.nodes[index];
  const radius = node.radius ?? 0;
  if (radius <= 0 || node.handleIn || node.handleOut) {return null;}
  const prevIndex = neighbourIndex(path, index, -1);
  const nextIndex = neighbourIndex(path, index, 1);
  if (prevIndex === null || nextIndex === null) {return null;}
  const prev = path.nodes[prevIndex];
  const next = path.nodes[nextIndex];
  if (prev.handleOut || next.handleIn) {return null;}

  const toPrev = { x: prev.x - node.x, y: prev.y - node.y };
  const toNext = { x: next.x - node.x, y: next.y - node.y };
  const lenPrev = Math.hypot(toPrev.x, toPrev.y);
  const lenNext = Math.hypot(toNext.x, toNext.y);
  if (lenPrev < 1e-9 || lenNext < 1e-9) {return null;}
  const u1 = { x: toPrev.x / lenPrev, y: toPrev.y / lenPrev };
  const u2 = { x: toNext.x / lenNext, y: toNext.y / lenNext };
  const cos = Math.min(1, Math.max(-1, u1.x * u2.x + u1.y * u2.y));
  const angle = Math.acos(cos);
  if (angle < 1e-3 || Math.PI - angle < 1e-3) {return null;}

  // Distance from the corner to the tangent points, limited to half of each segment.
  const wanted = radius / Math.tan(angle / 2);
  const tangent = Math.min(wanted, lenPrev / 2, lenNext / 2);
  const actualRadius = tangent * Math.tan(angle / 2);
  const turn = Math.PI - angle;
  const k = (4 / 3) * Math.tan(turn / 4) * actualRadius;

  const entry = { x: node.x + u1.x * tangent, y: node.y + u1.y * tangent };
  const exit = { x: node.x + u2.x * tangent, y: node.y + u2.y * tangent };
  return {
    entry,
    exit,
    c1: { x: entry.x - u1.x * k, y: entry.y - u1.y * k },
    c2: { x: exit.x - u2.x * k, y: exit.y - u2.y * k },
  };
}

function segmentCommand(
  from: ProfileNode,
  to: ProfileNode,
  start: ProfileVec2,
  end: ProfileVec2,
): string {
  if (!from.handleOut && !to.handleIn) {
    return `L${fmt(end)}`;
  }
  const c1 = from.handleOut
    ? { x: from.x + from.handleOut.x, y: from.y + from.handleOut.y }
    : start;
  const c2 = to.handleIn ? { x: to.x + to.handleIn.x, y: to.y + to.handleIn.y } : end;
  return `C${fmt(c1)} ${fmt(c2)} ${fmt(end)}`;
}

/** SVG path data (`d`) for one profile path, including rounded corners. */
export function profilePathToSvgData(path: ProfilePath): string {
  const { nodes } = path;
  if (nodes.length === 0) {
    return '';
  }
  const fillets = nodes.map((_node, index) => filletCorner(path, index));
  const entryOf = (i: number): ProfileVec2 => fillets[i]?.entry ?? nodes[i];
  const exitOf = (i: number): ProfileVec2 => fillets[i]?.exit ?? nodes[i];
  const cornerOf = (i: number): string => {
    const fillet = fillets[i];
    return fillet ? `C${fmt(fillet.c1)} ${fmt(fillet.c2)} ${fmt(fillet.exit)}` : '';
  };

  const parts = [`M${fmt(exitOf(0))}`];
  for (let i = 1; i < nodes.length; i++) {
    parts.push(segmentCommand(nodes[i - 1], nodes[i], exitOf(i - 1), entryOf(i)));
    parts.push(cornerOf(i));
  }
  if (path.closed && nodes.length > 1) {
    const last = nodes.length - 1;
    const first = nodes[0];
    const needsSegment =
      nodes[last].handleOut !== undefined || first.handleIn !== undefined || fillets[0] !== null;
    if (needsSegment) {
      parts.push(segmentCommand(nodes[last], first, exitOf(last), entryOf(0)));
      parts.push(cornerOf(0));
    }
    parts.push('Z');
  }
  return parts.join('');
}

export interface ProfileBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Bounds of all nodes and handle points (a cheap, conservative box). */
export function profileControlBounds(profile: Profile): ProfileBounds | null {
  let bounds: ProfileBounds | null = null;
  const include = (x: number, y: number) => {
    bounds = bounds
      ? {
          minX: Math.min(bounds.minX, x),
          maxX: Math.max(bounds.maxX, x),
          minY: Math.min(bounds.minY, y),
          maxY: Math.max(bounds.maxY, y),
        }
      : { minX: x, maxX: x, minY: y, maxY: y };
  };
  for (const path of profile.paths) {
    for (const node of path.nodes) {
      include(node.x, node.y);
      if (node.handleIn) {include(node.x + node.handleIn.x, node.y + node.handleIn.y);}
      if (node.handleOut) {include(node.x + node.handleOut.x, node.y + node.handleOut.y);}
    }
  }
  return bounds;
}

/**
 * Serialise a profile to a lathe SVG (1 unit = 1 mm) with `path_*` slot classes,
 * so the existing SVG-based asset pipeline can consume it unchanged.
 */
export function profileToSvg(profile: Profile): string {
  const box = profileControlBounds(profile) ?? { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  const width = round(Math.max(box.maxX, 0));
  const height = round(Math.max(box.maxY, 0));
  const paths = [...profile.paths]
    .sort((a, b) => a.slot - b.slot)
    .map((path) => {
      const className = LATHE_PATH_SLOT_CLASSES[path.slot];
      const stroke = LATHE_PATH_SLOT_STROKES[path.slot];
      return `  <path class="${className}" stroke="${stroke}" fill="none" data-name="${escapeXml(path.name)}" d="${profilePathToSvgData(path)}"/>`;
    });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
    ...paths,
    '</svg>',
    '',
  ].join('\n');
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
