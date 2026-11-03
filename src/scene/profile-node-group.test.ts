import { describe, expect, it } from 'vitest';
import type { ProfilePath } from './profile-model';
import {
  deleteNodeGroup,
  groupBounds,
  groupNodes,
  mergeSelection,
  nodesInRect,
  moveNodeGroup,
  nodeSnapshots,
  nodeStarts,
  rotateAbout,
  scaleAbout,
  toggleGroupNode,
  transformNodeGroup,
} from './profile-node-group';

function path(id: string, n: number): ProfilePath {
  return {
    id, name: id, slot: 0, closed: false,
    nodes: Array.from({ length: n }, (_v, i) => ({ x: i * 10, y: 0, mode: 'corner' as const })),
  };
}

describe('profile node group', () => {
  it('toggles nodes in and out of the selection', () => {
    let sel = toggleGroupNode({ active: { pathId: 'a', index: 0 }, extras: [] }, { pathId: 'b', index: 1 });
    expect(sel.active).toEqual({ pathId: 'b', index: 1 });
    expect(groupNodes(sel)).toHaveLength(2);
    sel = toggleGroupNode(sel, { pathId: 'b', index: 1 });
    expect(sel).toEqual({ active: { pathId: 'a', index: 0 }, extras: [] });
    sel = toggleGroupNode({ active: { pathId: 'a', index: 0 }, extras: [{ pathId: 'a', index: 2 }] }, { pathId: 'a', index: 2 });
    expect(sel).toEqual({ active: { pathId: 'a', index: 0 }, extras: [] });
  });

  it('moves nodes across paths by the same delta', () => {
    const paths = [path('a', 3), path('b', 3)];
    const starts = nodeStarts(paths, [{ pathId: 'a', index: 1 }, { pathId: 'b', index: 2 }]);
    const moved = moveNodeGroup(paths, starts, { x: 5, y: -2 });
    expect(moved[0].nodes[1]).toMatchObject({ x: 15, y: -2 });
    expect(moved[1].nodes[2]).toMatchObject({ x: 25, y: -2 });
    expect(moved[0].nodes[0]).toMatchObject({ x: 0, y: 0 });
  });

  it('deletes several nodes of one path by index', () => {
    const [result] = deleteNodeGroup([path('a', 5)], [{ pathId: 'a', index: 1 }, { pathId: 'a', index: 3 }]);
    expect(result.nodes.map((node) => node.x)).toEqual([0, 20, 40]);
  });

  it('scales nodes and handles about a pivot', () => {
    const base = path('a', 3);
    base.nodes[2] = { ...base.nodes[2], handleIn: { x: -4, y: 2 } };
    const snaps = nodeSnapshots([base], [{ pathId: 'a', index: 0 }, { pathId: 'a', index: 2 }]);
    const [result] = transformNodeGroup([base], snaps, scaleAbout({ x: 0, y: 0 }, 2, 3));
    expect(result.nodes[2]).toMatchObject({ x: 40, y: 0, handleIn: { x: -8, y: 6 } });
    expect(result.nodes[1]).toMatchObject({ x: 10, y: 0 });
  });

  it('rotates nodes about the box centre', () => {
    const base = path('a', 3);
    const points = [{ pathId: 'a', index: 0 }, { pathId: 'a', index: 2 }];
    expect(groupBounds([base], points)).toEqual({ minX: 0, minY: 0, maxX: 20, maxY: 0 });
    const [result] = transformNodeGroup([base], nodeSnapshots([base], points), rotateAbout({ x: 10, y: 0 }, Math.PI / 2));
    expect(result.nodes[0].x).toBeCloseTo(10);
    expect(result.nodes[0].y).toBeCloseTo(-10);
    expect(result.nodes[2].x).toBeCloseTo(10);
    expect(result.nodes[2].y).toBeCloseTo(10);
  });

  it('finds nodes inside a box', () => {
    const hits = nodesInRect([path('a', 4), path('b', 2)], { minX: 5, maxX: 20, minY: -1, maxY: 1 });
    expect(hits).toEqual([{ pathId: 'a', index: 1 }, { pathId: 'a', index: 2 }, { pathId: 'b', index: 1 }]);
  });

  it('replaces, adds and removes box hits', () => {
    const p = (index: number) => ({ pathId: 'a', index });
    const current = { active: p(0), extras: [p(1)] };
    expect(mergeSelection(current, [p(2), p(3)], 'replace')).toEqual({ active: p(3), extras: [p(2)] });
    expect(mergeSelection(current, [p(1), p(2)], 'add')).toEqual({ active: p(0), extras: [p(1), p(2)] });
    expect(mergeSelection(current, [p(0)], 'remove')).toEqual({ active: p(1), extras: [] });
    expect(mergeSelection(current, [p(1)], 'remove')).toEqual({ active: p(0), extras: [] });
    expect(mergeSelection({ active: null, extras: [] }, [], 'replace')).toEqual({ active: null, extras: [] });
  });
});
