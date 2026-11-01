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
  /** Parametric corner rounding in mm (applied by the editor in a later step; unused yet). */
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

function segmentCommand(from: ProfileNode, to: ProfileNode): string {
  if (!from.handleOut && !to.handleIn) {
    return `L${fmt(to)}`;
  }
  const c1 = from.handleOut
    ? { x: from.x + from.handleOut.x, y: from.y + from.handleOut.y }
    : from;
  const c2 = to.handleIn ? { x: to.x + to.handleIn.x, y: to.y + to.handleIn.y } : to;
  return `C${fmt(c1)} ${fmt(c2)} ${fmt(to)}`;
}

/** SVG path data (`d`) for one profile path. */
export function profilePathToSvgData(path: ProfilePath): string {
  const { nodes } = path;
  const first = nodes.at(0);
  if (!first) {
    return '';
  }
  const parts = [`M${fmt(first)}`];
  for (let i = 1; i < nodes.length; i++) {
    parts.push(segmentCommand(nodes[i - 1], nodes[i]));
  }
  if (path.closed && nodes.length > 1) {
    const last = nodes[nodes.length - 1];
    if (last.handleOut || first.handleIn) {
      parts.push(segmentCommand(last, first));
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
