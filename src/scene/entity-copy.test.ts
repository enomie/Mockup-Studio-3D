import { describe, expect, it } from 'vitest';
import { copyEntities, nextCopyName } from './entity-copy';
import type { AssetEntity } from './entity-types';

function entity(id: string, name: string, extra: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id,
    type: 'asset',
    name,
    assetKind: 'block',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    transform: { position: { x: 1, y: 0.5, z: 2 }, rotation: { x: 0, y: 0.3, z: 0 } },
    ...extra,
  };
}

describe('nextCopyName', () => {
  it('appends 2 to a plain name', () => {
    expect(nextCopyName('Box', ['Box'])).toBe('Box 2');
  });

  it('counts up from the highest number in use', () => {
    expect(nextCopyName('Box', ['Box', 'Box 2', 'Box 5'])).toBe('Box 6');
    expect(nextCopyName('Box 2', ['Box', 'Box 2'])).toBe('Box 3');
  });

  it('handles names with regex characters', () => {
    expect(nextCopyName('A (1)', ['A (1)'])).toBe('A (1) 2');
  });
});

describe('copyEntities', () => {
  it('creates deep copies with new ids, copy names and an offset', () => {
    const source = entity('a', 'Box', { blockParams: { widthM: 1 } as never });
    let n = 0;
    const [copy] = copyEntities([source], ['Box'], { x: 0.1, y: 0, z: 0.1 }, () => `new-${++n}`);
    expect(copy.id).toBe('new-1');
    expect(copy.name).toBe('Box 2');
    expect(copy.transform.position).toEqual({ x: 1.1, y: 0.5, z: 2.1 });
    expect(copy.transform.rotation).toEqual(source.transform.rotation);
    expect(copy.blockParams).not.toBe(source.blockParams);
    expect(source.transform.position).toEqual({ x: 1, y: 0.5, z: 2 });
  });

  it('gives every copy of a multi-selection its own name', () => {
    const copies = copyEntities([entity('a', 'Box'), entity('b', 'Box')], ['Box']);
    expect(copies.map((c) => c.name)).toEqual(['Box 2', 'Box 3']);
  });

  it('drops patch node links and remaps edge links within the copied set', () => {
    const patch = (id: string, partner: string): AssetEntity => entity(id, 'Patch', {
      assetKind: 'triangle-patch',
      patchParams: {
        divisions: 4,
        points: [{ id: 'p', nodeId: 'node-1' } as never],
        cornerIds: [],
        edgeParams: {},
        edgeLinks: [{ startPointId: 's', endPointId: 'e', partnerEntityId: partner, partnerStartPointId: 's', partnerEndPointId: 'e' }],
      },
    });
    let n = 0;
    const [a, b] = copyEntities([patch('a', 'b'), patch('b', 'a')], [], undefined, () => `n${++n}`);
    expect(a.patchParams?.points[0].nodeId).toBeUndefined();
    expect(a.patchParams?.edgeLinks?.[0].partnerEntityId).toBe(b.id);

    const [lone] = copyEntities([patch('a', 'other')], []);
    expect(lone.patchParams?.edgeLinks).toBeUndefined();
  });
});
