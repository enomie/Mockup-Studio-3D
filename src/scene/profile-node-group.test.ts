import { describe, expect, it } from 'vitest';
import type { ProfilePath } from './profile-model';
import { deleteNodeGroup, groupNodes, moveNodeGroup, nodeStarts, toggleGroupNode } from './profile-node-group';

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
});
