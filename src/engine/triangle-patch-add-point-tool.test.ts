import { describe, expect, it } from 'vitest';
import { Group, OrthographicCamera, Scene, Vector2 } from 'three/webgpu';
import { findClosestEdgeHit, TrianglePatchAddPointTool } from './triangle-patch-add-point-tool';
import type { EntityRegistry } from './entity-registry';
import type { PatchParams } from '@/scene/asset-triangle-patch';

const horizontal = [new Vector2(0, 0), new Vector2(50, 0), new Vector2(100, 0)];
const vertical = [new Vector2(200, 0), new Vector2(200, 100)];

describe('findClosestEdgeHit', () => {
  it('returns the edge and parameter under the pointer', () => {
    const hit = findClosestEdgeHit([horizontal, vertical], new Vector2(75, 5), 10);
    expect(hit?.edgeIndex).toBe(0);
    expect(hit?.t).toBeCloseTo(0.75);
  });

  it('picks the closer of two edges', () => {
    const hit = findClosestEdgeHit([horizontal, vertical], new Vector2(196, 40), 10);
    expect(hit?.edgeIndex).toBe(1);
    expect(hit?.t).toBeCloseTo(0.4);
  });

  it('returns null outside the hover radius', () => {
    expect(findClosestEdgeHit([horizontal, vertical], new Vector2(50, 30), 10)).toBeNull();
  });

  it('skips samples behind the camera', () => {
    const clipped = [new Vector2(0, 0), null, new Vector2(100, 0)];
    expect(findClosestEdgeHit([clipped], new Vector2(50, 0), 10)).toBeNull();
  });
});

describe('TrianglePatchAddPointTool mirror copies', () => {
  const v = (x: number, y: number) => ({ x, y, z: 0 });
  const point = (id: string, x: number, y: number) => ({
    id,
    name: id,
    pos: v(x, y),
    handleNext: v(x, y),
    handlePrev: v(x, y),
    handleCrossIn: v(x, y),
    handleCrossOut: v(x, y),
  });

  function setup(mirrorX: boolean) {
    const object = new Group();
    const params = {
      divisions: 4,
      points: [point('a', 0.2, 0), point('b', 0.8, 0), point('c', 0.5, 0.6)],
      cornerIds: ['a', 'b', 'c'],
      edgeParams: {},
      ...(mirrorX ? { mirror: { x: true, y: false, z: false } } : {}),
    } as PatchParams;
    const runtime = { entity: { id: 'p1', assetKind: 'triangle-patch', patchParams: params }, object };
    const registry = { getRuntime: () => runtime } as unknown as EntityRegistry;
    const tool = new TrianglePatchAddPointTool(new Scene(), registry);
    tool.start('p1');
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.set(0, 0, 5);
    // Screen 200 x 200 px: world x = ndc x, world y = ndc y.
    const pointer = (ndcX: number, ndcY: number) => ({ ndc: new Vector2(ndcX, ndcY), widthPx: 200, heightPx: 200 });
    return { tool, camera, pointer };
  }

  it('hits the edge of a mirror copy and reports the original edge parameter', () => {
    const { tool, camera, pointer } = setup(true);
    // Midpoint of the original edge a-b is (0.5, 0); its mirror copy is at (-0.5, 0).
    const original = tool.hitAt(pointer(0.5, 0), camera);
    const copy = tool.hitAt(pointer(-0.5, 0), camera);
    expect(original?.edgeIndex).toBe(copy?.edgeIndex);
    expect(copy?.t).toBeCloseTo(original?.t ?? -1);
  });

  it('does not hit anything at the mirrored position without mirroring', () => {
    const { tool, camera, pointer } = setup(false);
    expect(tool.hitAt(pointer(-0.5, 0), camera)).toBeNull();
  });
});
