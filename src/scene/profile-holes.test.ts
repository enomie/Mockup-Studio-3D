import { describe, expect, it } from 'vitest';
import { classifyExtrusionPaths, polygonContains } from './profile-holes';
import type { ProfilePath } from './profile-model';

function rect(id: string, x: number, y: number, w: number, h: number, extra: Partial<ProfilePath> = {}): ProfilePath {
  return {
    id,
    name: id,
    slot: 0,
    closed: true,
    nodes: [
      { x, y, mode: 'corner' },
      { x: x + w, y, mode: 'corner' },
      { x: x + w, y: y + h, mode: 'corner' },
      { x, y: y + h, mode: 'corner' },
    ],
    ...extra,
  };
}
const sample = (path: ProfilePath) => path.nodes.map((node) => ({ x: node.x, y: node.y }));

describe('extrusion holes', () => {
  it('detects containment', () => {
    expect(polygonContains(sample(rect('a', 0, 0, 10, 10)), sample(rect('b', 2, 2, 3, 3)))).toBe(true);
    expect(polygonContains(sample(rect('a', 0, 0, 10, 10)), sample(rect('b', 8, 2, 5, 3)))).toBe(false);
  });

  it('makes inner paths holes and islands in holes solids again', () => {
    const roles = classifyExtrusionPaths(
      [rect('outer', 0, 0, 100, 100), rect('hole', 10, 10, 80, 80), rect('island', 40, 40, 20, 20)],
      sample,
    );
    expect(roles.get('outer')).toEqual({ kind: 'solid', overlaps: false });
    expect(roles.get('hole')).toEqual({ kind: 'hole', parentId: 'outer' });
    expect(roles.get('island')).toEqual({ kind: 'solid', overlaps: false });
  });

  it('keeps overlapping, open and cut-hole-off paths as they are', () => {
    const open: ProfilePath = { ...rect('open', 20, 20, 5, 5), closed: false };
    const roles = classifyExtrusionPaths(
      [
        rect('outer', 0, 0, 100, 100),
        rect('overlap', 90, 10, 20, 20),
        rect('knob', 40, 40, 10, 10, { cutHole: false }),
        open,
      ],
      sample,
    );
    expect(roles.get('overlap')).toEqual({ kind: 'solid', overlaps: true });
    expect(roles.get('outer')).toEqual({ kind: 'solid', overlaps: true });
    expect(roles.get('knob')).toEqual({ kind: 'solid', overlaps: false });
    expect(roles.get('open')).toEqual({ kind: 'shell' });
  });

  it('ignores cut-hole-off paths when nesting others', () => {
    const roles = classifyExtrusionPaths(
      [rect('outer', 0, 0, 100, 100), rect('knob', 10, 10, 80, 80, { cutHole: false }), rect('inner', 40, 40, 10, 10)],
      sample,
    );
    expect(roles.get('inner')).toEqual({ kind: 'hole', parentId: 'outer' });
  });
});
