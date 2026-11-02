import { describe, expect, it } from 'vitest';
import {
  addSquarePath,
  breakAtNode,
  breakAtSegment,
  joinEndpoints,
  closestTOnSegment,
  nextFreeSlot,
  removePath,
  setPathSlot,
  deleteNode,
  handleFromPolar,
  handlePolar,
  insertNode,
  pointOnSegment,
  segmentCount,
  setHandle,
  toggleNodeMode,
} from './profile-edit';
import { filletCorner, profilePathToSvgData, type ProfilePath } from './profile-model';

const square = (): ProfilePath => ({
  id: 'p',
  name: 'Square',
  slot: 0,
  closed: true,
  nodes: [
    { x: 0, y: 0, mode: 'corner' },
    { x: 10, y: 0, mode: 'corner' },
    { x: 10, y: 10, mode: 'corner' },
    { x: 0, y: 10, mode: 'corner' },
  ],
});

const curve = (): ProfilePath => ({
  id: 'c',
  name: 'Curve',
  slot: 0,
  closed: false,
  nodes: [
    { x: 0, y: 0, mode: 'corner', handleOut: { x: 0, y: -10 } },
    { x: 20, y: 0, mode: 'corner', handleIn: { x: 0, y: -10 } },
  ],
});

describe('profile edit', () => {
  it('mirrors the opposite handle of smooth nodes and breaks with shift', () => {
    const path: ProfilePath = {
      ...curve(),
      nodes: [
        { x: 0, y: 0, mode: 'smooth', handleIn: { x: -5, y: 0 }, handleOut: { x: 2, y: 0 } },
        { x: 10, y: 0, mode: 'corner' },
      ],
    };
    const moved = setHandle(path, 0, 'out', { x: 0, y: 4 });
    expect(moved.nodes[0].handleIn?.x).toBeCloseTo(0);
    expect(moved.nodes[0].handleIn?.y).toBeCloseTo(-5);

    const broken = setHandle(path, 0, 'out', { x: 0, y: 4 }, true);
    expect(broken.nodes[0].mode).toBe('corner');
    expect(broken.nodes[0].handleIn).toEqual({ x: -5, y: 0 });
  });

  it('converts handles between polar and cartesian', () => {
    const polar = handlePolar(handleFromPolar(5, 90));
    expect(polar.length).toBeCloseTo(5);
    expect(polar.angleDeg).toBeCloseTo(90);
    expect(handleFromPolar(5, 90).y).toBeCloseTo(-5); // up on screen = -y
  });

  it('toggles corner and smooth', () => {
    const smooth = toggleNodeMode(square(), 1);
    expect(smooth.nodes[1].mode).toBe('smooth');
    expect(smooth.nodes[1].handleIn).toBeDefined();
    const corner = toggleNodeMode(smooth, 1);
    expect(corner.nodes[1].handleIn).toBeUndefined();
    expect(corner.nodes[1].mode).toBe('corner');
  });

  it('keeps at least two nodes and opens paths that get too short', () => {
    let path = square();
    path = deleteNode(path, 0);
    expect(path.closed).toBe(true);
    path = deleteNode(path, 0);
    expect(path.nodes).toHaveLength(2);
    expect(path.closed).toBe(false);
    expect(deleteNode(path, 0).nodes).toHaveLength(2);
  });

  it('inserts nodes without changing the shape', () => {
    const original = curve();
    const { path, index } = insertNode(original, 0, 0.3);
    expect(index).toBe(1);
    expect(path.nodes).toHaveLength(3);
    for (const t of [0.1, 0.5, 0.9]) {
      const before = pointOnSegment(original, 0, 0.3 * t);
      const after = pointOnSegment(path, 0, t);
      expect(after.x).toBeCloseTo(before.x, 6);
      expect(after.y).toBeCloseTo(before.y, 6);
    }

    const straight = insertNode(square(), 3, 0.5);
    expect(straight.path.nodes[4]).toEqual({ x: 0, y: 5, mode: 'corner' });
    expect(segmentCount(straight.path)).toBe(5);
  });

  it('finds the closest point on a segment', () => {
    const t = closestTOnSegment(square(), 0, { x: 7, y: 3 });
    const point = pointOnSegment(square(), 0, t);
    expect(point.x).toBeCloseTo(7, 3);
    expect(point.y).toBeCloseTo(0, 6);
  });

  it('rounds corners between straight segments', () => {
    const path = square();
    path.nodes[1] = { ...path.nodes[1], radius: 2 };
    const fillet = filletCorner(path, 1);
    expect(fillet?.entry.x).toBeCloseTo(8);
    expect(fillet?.exit.y).toBeCloseTo(2);
    expect(profilePathToSvgData(path)).toContain('L8,0C');

    path.nodes[1] = { ...path.nodes[1], radius: 50 };
    expect(filletCorner(path, 1)?.entry.x).toBeCloseTo(5); // limited to half the segment
  });
});

describe('profile paths', () => {
  const two = (): ProfilePath[] => [
    { ...square(), id: 'a', slot: 0 },
    { ...curve(), id: 'b', slot: 3 },
  ];

  it('finds free slots and adds square paths until all ten are used', () => {
    expect(nextFreeSlot(two())).toBe(1);
    let paths: ProfilePath[] | null = two();
    for (let i = 0; i < 8; i++) {paths = paths ? addSquarePath(paths) : null;}
    expect(paths?.map((path) => path.slot).sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(paths && addSquarePath(paths)).toBeNull();
    expect(new Set(paths?.map((path) => path.id)).size).toBe(10);
  });

  it('swaps slots and removes paths', () => {
    const swapped = setPathSlot(two(), 'b', 0);
    expect(swapped.find((path) => path.id === 'b')?.slot).toBe(0);
    expect(swapped.find((path) => path.id === 'a')?.slot).toBe(3);
    expect(setPathSlot(two(), 'b', 5).find((path) => path.id === 'b')?.slot).toBe(5);
    expect(removePath(two(), 'a').map((path) => path.id)).toEqual(['b']);
  });
});

describe('scissors and join', () => {
  const open3 = (): ProfilePath => ({
    id: 'o',
    name: 'Line',
    slot: 0,
    closed: false,
    nodes: [
      { x: 0, y: 0, mode: 'corner' },
      { x: 10, y: 0, mode: 'smooth', handleIn: { x: -2, y: 0 }, handleOut: { x: 2, y: 0 } },
      { x: 20, y: 0, mode: 'corner' },
    ],
  });

  it('opens a closed path at a point without changing its outline', () => {
    const result = breakAtNode([square()], 'p', 1);
    const path = result?.paths[0];
    expect(path?.closed).toBe(false);
    expect(path?.nodes.map((node) => [node.x, node.y])).toEqual([[10, 0], [10, 10], [0, 10], [0, 0], [10, 0]]);
    expect(result?.select).toEqual({ pathId: 'p', index: 0 });
  });

  it('splits an open path into two, the second in a free slot', () => {
    const result = breakAtNode([open3()], 'o', 1);
    expect(result?.paths).toHaveLength(2);
    const [a, b] = result?.paths ?? [];
    expect(a.nodes.map((node) => node.x)).toEqual([0, 10]);
    expect(a.nodes[1].handleOut).toBeUndefined();
    expect(a.nodes[1].handleIn).toEqual({ x: -2, y: 0 });
    expect(b.nodes.map((node) => node.x)).toEqual([10, 20]);
    expect(b.nodes[0].handleIn).toBeUndefined();
    expect(b.slot).toBe(1);
    expect(b.name).toBe('Line 2');
    expect(breakAtNode([open3()], 'o', 0)).toBeNull();
  });

  it('cuts in the middle of a segment', () => {
    const result = breakAtSegment([open3()], 'o', 1, 0.5);
    expect(result?.paths).toHaveLength(2);
    // Curved segment (handle 10 → 12): the cubic at t = 0.5 lies at x = 15.75.
    expect(result?.paths[1].nodes[0].x).toBeCloseTo(15.75, 4);
  });

  it('joins two paths and merges touching endpoints', () => {
    const split = breakAtNode([open3()], 'o', 1);
    if (!split) {throw new Error('split failed');}
    const [a, b] = split.paths;
    const joined = joinEndpoints(split.paths, { pathId: a.id, index: 1 }, { pathId: b.id, index: 0 });
    expect(joined?.paths).toHaveLength(1);
    expect(joined?.paths[0].nodes.map((node) => node.x)).toEqual([0, 10, 20]);
    // Joining the far ends reverses one path and keeps every point.
    const far = joinEndpoints(split.paths, { pathId: a.id, index: 0 }, { pathId: b.id, index: 1 });
    expect(far?.paths[0].nodes.map((node) => node.x)).toEqual([10, 0, 20, 10]);
  });

  it('closes a path when its own start and end are joined', () => {
    const result = joinEndpoints([open3()], { pathId: 'o', index: 0 }, { pathId: 'o', index: 2 });
    expect(result?.paths[0].closed).toBe(true);
    expect(joinEndpoints([open3()], { pathId: 'o', index: 0 }, { pathId: 'o', index: 1 })).toBeNull();
  });
});
