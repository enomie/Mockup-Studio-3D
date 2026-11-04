import { describe, expect, it } from 'vitest';
import type { ProfilePath } from './profile-model';
import { copyProfileSelection, cutProfileSelection, pasteProfileFragments } from './profile-clipboard';

function path(id: string, slot: number, count: number, closed: boolean): ProfilePath {
  return {
    id,
    name: 'Glass',
    slot,
    closed,
    nodes: Array.from({ length: count }, (_v, i) => ({ x: i * 10, y: 0, mode: 'corner' as const })),
  };
}

const all = (p: ProfilePath) => p.nodes.map((_n, index) => ({ pathId: p.id, index }));

describe('copyProfileSelection', () => {
  it('copies a fully selected closed path whole', () => {
    const square = path('a', 0, 4, true);
    const [copy] = copyProfileSelection([square], all(square));
    expect(copy.closed).toBe(true);
    expect(copy.nodes).toHaveLength(4);
  });

  it('copies a path selected without nodes whole', () => {
    const square = path('a', 0, 4, true);
    expect(copyProfileSelection([square], [], 'a')).toHaveLength(1);
  });

  it('turns consecutive selected nodes into open runs, wrapping on closed paths', () => {
    const ring = path('a', 0, 6, true);
    const runs = copyProfileSelection([ring], [0, 1, 3, 5].map((index) => ({ pathId: 'a', index })));
    expect(runs).toHaveLength(1);
    expect(runs[0].closed).toBe(false);
    expect(runs[0].nodes.map((n) => n.x)).toEqual([50, 0, 10]);
  });

  it('skips single loose nodes', () => {
    const line = path('a', 0, 4, false);
    expect(copyProfileSelection([line], [{ pathId: 'a', index: 2 }])).toHaveLength(0);
  });
});

describe('cutProfileSelection', () => {
  it('removes fully selected paths and deletes nodes of partly selected ones', () => {
    const a = path('a', 0, 4, true);
    const b = path('b', 1, 4, false);
    const next = cutProfileSelection([a, b], [...all(a), { pathId: 'b', index: 1 }]);
    expect(next.map((p) => p.id)).toEqual(['b']);
    expect(next[0].nodes).toHaveLength(3);
  });
});

describe('pasteProfileFragments', () => {
  it('adds shifted copies with new ids, names and free slots', () => {
    const a = path('a', 0, 3, false);
    const result = pasteProfileFragments([a], [a], { x: 5, y: 5 });
    const pasted = result.paths[1];
    expect(pasted.id).not.toBe('a');
    expect(pasted.name).toBe('Glass 2');
    expect(pasted.slot).toBe(1);
    expect(pasted.nodes[0]).toMatchObject({ x: 5, y: 5 });
    expect(result.pasted).toHaveLength(3);
    expect(a.nodes[0].x).toBe(0);
  });

  it('skips fragments when every colour slot is taken', () => {
    const full = Array.from({ length: 10 }, (_v, slot) => path(`p${slot}`, slot, 2, false));
    const result = pasteProfileFragments(full, [full[0]], { x: 0, y: 0 });
    expect(result.skipped).toBe(1);
    expect(result.paths).toHaveLength(10);
  });
});
