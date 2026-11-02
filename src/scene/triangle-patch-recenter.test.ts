import { describe, expect, it } from 'vitest';
import { defaultPatchParamsForKind, type PatchParams } from './asset-triangle-patch';
import type { AssetEntity, EntityTransform, Vec3 } from './entity-types';
import { joinSharedEdge, patchLocalToWorld, reconcilePatchNodes } from './patch-nodes';
import { listPatchSegments } from './triangle-patch-edge-link';
import { patchCenterOffset, recenterPatch, scalePatchPoints } from './triangle-patch-recenter';

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const dist = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function shifted(params: PatchParams, d: Vec3): PatchParams {
  return {
    ...params,
    points: params.points.map((p) => ({ ...p, pos: v(p.pos.x + d.x, p.pos.y + d.y, p.pos.z + d.z) })),
  };
}

describe('recenterPatch', () => {
  const transform: EntityTransform = { position: v(2, 0, 1), rotation: v(0, 0.7, 0.2) };

  it('moves the pivot to the center and keeps every point in place in the scene', () => {
    const params = shifted(defaultPatchParamsForKind('quad-patch'), v(3, 1, -2));
    const result = recenterPatch(params, transform);
    expect(result).not.toBeNull();
    const next: EntityTransform = { ...transform, position: result!.position };
    params.points.forEach((before, i) => {
      const after = result!.params.points[i];
      for (const key of ['pos', 'handleNext', 'handlePrev', 'handleCrossIn', 'handleCrossOut'] as const) {
        expect(dist(patchLocalToWorld(before[key], transform), patchLocalToWorld(after[key], next))).toBeLessThan(1e-9);
      }
    });
    expect(patchCenterOffset(result!.params)).toBeNull();
    expect(recenterPatch(result!.params, next)).toBeNull();
  });

  it('keeps mirrored axes at the pivot', () => {
    const params = { ...shifted(defaultPatchParamsForKind('quad-patch'), v(3, 1, -2)), mirror: { x: true, y: false, z: false } };
    const offset = patchCenterOffset(params)!;
    expect(offset.x).toBe(0);
    expect(offset.y).not.toBe(0);
  });

  it('scales points and handles around the pivot', () => {
    const params = defaultPatchParamsForKind('triangle-patch');
    const scaled = scalePatchPoints(params, 2);
    expect(scaled[0].pos.x).toBeCloseTo(params.points[0].pos.x * 2);
    expect(scaled[0].handleNext.z).toBeCloseTo(params.points[0].handleNext.z * 2);
  });

  it('does not drag shared nodes along when a patch is recentered', () => {
    const mk = (id: string, t: EntityTransform): AssetEntity => ({
      id, type: 'asset', name: id, assetKind: 'triangle-patch', screenImageId: null, sizeScale: 1, visible: true,
      transform: t, patchParams: defaultPatchParamsForKind('triangle-patch'),
    });
    const A = mk('A', { position: v(0, 0, 0), rotation: v(0, 0, 0) });
    const B = mk('B', { position: v(0.3, 0.05, 0.2), rotation: v(0, 0.9, 0.1) });
    const segA = listPatchSegments(A.patchParams!)[0];
    const segB = listPatchSegments(B.patchParams!)[1];
    let n = 0;
    const joined = joinSharedEdge(
      { entity: A, segment: segA },
      { entity: B, segment: { startPointId: segB.endPointId, endPointId: segB.startPointId } },
      () => `node-${++n}`,
    )!;
    const a: AssetEntity = { ...A, patchParams: joined.aParams };
    const b: AssetEntity = { ...B, patchParams: joined.bParams };
    const re = recenterPatch(a.patchParams!, a.transform)!;
    const a2: AssetEntity = { ...a, transform: { ...a.transform, position: re.position }, patchParams: re.params };
    const previous = new Map([[a.id, a], [b.id, b]]);
    const result = reconcilePatchNodes(previous, [a2, b], joined.nodes);
    const nodes = result.nodes ?? joined.nodes;
    joined.nodes.forEach((node, i) => { expect(dist(node.pos, nodes[i].pos)).toBeLessThan(1e-9); });
    expect(result.points.has('B')).toBe(false);
  });
});
