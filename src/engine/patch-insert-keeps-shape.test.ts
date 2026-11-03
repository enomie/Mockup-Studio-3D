import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three/webgpu';
import { defaultPatchParamsForKind, isSeamFollowingEnds, type PatchParams } from '@/scene/asset-triangle-patch';
import type { AssetEntity, EntityTransform } from '@/scene/entity-types';
import { createInnerNode, joinSharedEdge, resolvePatchPoints } from '@/scene/patch-nodes';
import { listPatchSegments, segmentHandleKeys } from '@/scene/triangle-patch-edge-link';
import { splitLinkOnInsert } from '@/scene/triangle-patch-linked-edit';
import { insertPatchPoint } from '@/scene/triangle-patch-point-edit';
import { evalEdgeCorrectedSurface, prepareEdgeCorrection, triangleEdgeCoordinates } from './patch-edge-correction';
import { evalPatchSurfacePoint } from './triangle-patch-geometry';

function patch(id: string, transform: EntityTransform): AssetEntity {
  return {
    id, type: 'asset', name: id, assetKind: 'triangle-patch', screenImageId: null, sizeScale: 1, visible: true,
    transform, patchParams: defaultPatchParamsForKind('triangle-patch'),
  };
}

function surface(params: PatchParams, u: number, v: number): Vector3 {
  const prepared = prepareEdgeCorrection(params);
  const w = 1 - u - v;
  return prepared
    ? evalEdgeCorrectedSurface(prepared, triangleEdgeCoordinates(u, v, w))
    : evalPatchSurfacePoint(params, u, v, w, new Vector3());
}

function maxDeviation(a: PatchParams, b: PatchParams): number {
  let max = 0;
  const n = 20;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; i + j <= n; j++) {max = Math.max(max, surface(a, i / n, j / n).distanceTo(surface(b, i / n, j / n)));}
  }
  return max;
}

/** Two joined patches, then a point inserted on the seam exactly like the engine does it. */
function insertOnSeam() {
  const A0 = patch('A', { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
  const B0 = patch('B', { position: { x: 0.3, y: 0.05, z: 0.2 }, rotation: { x: 0.4, y: 0.9, z: 0.1 } });
  const segA = listPatchSegments(A0.patchParams!)[0];
  const segB = listPatchSegments(B0.patchParams!)[1];
  const joined = joinSharedEdge(
    { entity: A0, segment: segA },
    { entity: B0, segment: { startPointId: segB.endPointId, endPointId: segB.startPointId } },
    () => crypto.randomUUID(),
  );
  if (!joined) {throw new Error('join failed');}
  const A = { ...A0, patchParams: joined.aParams };
  const B = { ...B0, patchParams: joined.bParams };
  const inserted = insertPatchPoint(A.patchParams, 0, 0.37);
  const split = splitLinkOnInsert(A, inserted, (id) => (id === 'A' ? A : B));
  if (!split) {throw new Error('split failed');}
  const partner = split.partners[0];
  const endLink = split.ownerParams.edgeLinks!.find((l) =>
    (l.startPointId === inserted.pointId && l.endPointId === inserted.endPointId) ||
    (l.endPointId === inserted.pointId && l.startPointId === inserted.endPointId))!;
  const qEnd = endLink.endPointId === inserted.endPointId ? endLink.partnerEndPointId : endLink.partnerStartPointId;
  const sameDirection = segmentHandleKeys(partner.partnerParams, partner.pointId, qEnd)?.a === 'handleNext';
  const node = createInnerNode(
    'inner',
    { entityId: 'A', transform: A.transform, point: split.ownerParams.points.find((p) => p.id === inserted.pointId)! },
    { entityId: 'B', transform: B.transform, point: partner.partnerParams.points.find((p) => p.id === partner.pointId)! },
    sameDirection,
    true,
  );
  return {
    before: { A: A.patchParams, B: B.patchParams },
    after: {
      A: { ...split.ownerParams, points: resolvePatchPoints(split.ownerParams.points, 'A', A.transform, [node]) },
      B: { ...partner.partnerParams, points: resolvePatchPoints(partner.partnerParams.points, 'B', B.transform, [node]) },
    },
    pointId: inserted.pointId,
  };
}

describe('inserting a point on a linked edge', () => {
  it('keeps both surfaces exactly as they were', () => {
    const { before, after } = insertOnSeam();
    expect(maxDeviation(before.A, after.A)).toBeLessThan(1e-9);
    expect(maxDeviation(before.B, after.B)).toBeLessThan(1e-9);
  });

  it('the point steers the seam once its cross handle is edited', () => {
    const { after, pointId } = insertOnSeam();
    const point = after.A.points.find((p) => p.id === pointId)!;
    expect(isSeamFollowingEnds(point)).toBe(true);
    const turned: PatchParams = {
      ...after.A,
      points: after.A.points.map((p) => (p.id === pointId
        ? { ...p, handleCrossIn: { x: p.handleCrossIn.x, y: p.handleCrossIn.y + 0.2, z: p.handleCrossIn.z } }
        : p)),
    };
    expect(isSeamFollowingEnds(turned.points.find((p) => p.id === pointId)!)).toBe(false);
    expect(maxDeviation(after.A, turned)).toBeGreaterThan(1e-4);
  });
});
