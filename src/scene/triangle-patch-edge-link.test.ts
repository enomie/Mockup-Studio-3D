import { describe, expect, it } from 'vitest';
import { defaultPatchParamsForKind, type PatchParams } from './asset-triangle-patch';
import type { AssetEntity, EntityTransform } from './entity-types';
import {
  applyEdgeShape,
  captureEdgeShape,
  isEdgeLinkValid,
  listPatchSegments,
  reverseEdgeShape,
  segmentHandleKeys,
  shouldReverseForTarget,
  type PatchEdgeLink,
} from './triangle-patch-edge-link';
import { insertPatchPoint, removePatchPoint } from './triangle-patch-point-edit';

const identity: EntityTransform = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };

function patchEntity(id: string, params: PatchParams, transform = identity): AssetEntity {
  return {
    id,
    type: 'asset',
    name: id,
    assetKind: 'triangle-patch',
    screenImageId: null,
    sizeScale: 1,
    visible: true,
    transform,
    patchParams: params,
  };
}

function expectClose(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  expect(a.x).toBeCloseTo(b.x, 9);
  expect(a.y).toBeCloseTo(b.y, 9);
  expect(a.z).toBeCloseTo(b.z, 9);
}

function link(params: PatchParams, partnerId: string, partner: PatchParams, mine: number, theirs: number, flip = false): PatchEdgeLink {
  const a = listPatchSegments(params)[mine];
  const b = listPatchSegments(partner)[theirs];
  return {
    startPointId: a.startPointId,
    endPointId: a.endPointId,
    partnerEntityId: partnerId,
    partnerStartPointId: flip ? b.endPointId : b.startPointId,
    partnerEndPointId: flip ? b.startPointId : b.endPointId,
  };
}

function backLink(l: PatchEdgeLink, ownerId: string): PatchEdgeLink {
  return {
    startPointId: l.partnerStartPointId,
    endPointId: l.partnerEndPointId,
    partnerEntityId: ownerId,
    partnerStartPointId: l.startPointId,
    partnerEndPointId: l.endPointId,
  };
}

describe('patch edge segments', () => {
  it('lists one segment per boundary point and finds handle keys in both directions', () => {
    const params = defaultPatchParamsForKind('triangle-patch');
    const segments = listPatchSegments(params);
    expect(segments).toHaveLength(3);
    const [s0] = segments;
    expect(segmentHandleKeys(params, s0.startPointId, s0.endPointId)).toEqual({ a: 'handleNext', b: 'handlePrev' });
    expect(segmentHandleKeys(params, s0.endPointId, s0.startPointId)).toEqual({ a: 'handlePrev', b: 'handleNext' });
  });

  it('rejects points that are not neighbors', () => {
    const { params } = insertPatchPoint(defaultPatchParamsForKind('quad-patch'), 0, 0.5);
    const [p0, , p2] = params.points;
    expect(segmentHandleKeys(params, p0.id, p2.id)).toBeNull();
  });
});

describe('edge copy and paste', () => {
  it('copies an edge 1:1 between differently placed patches', () => {
    const src = defaultPatchParamsForKind('triangle-patch');
    const dst = defaultPatchParamsForKind('triangle-patch');
    const srcT: EntityTransform = { position: { x: 1, y: 0.2, z: 0 }, rotation: { x: 0, y: 0.8, z: 0 } };
    const dstT: EntityTransform = { position: { x: -2, y: 0, z: 1 }, rotation: { x: 0.4, y: 0, z: 0.1 } };
    const seg = listPatchSegments(src)[1];
    const shape = captureEdgeShape(src, srcT, seg);
    expect(shape).not.toBeNull();
    if (!shape) {return;}
    const target = listPatchSegments(dst)[2];
    const points = applyEdgeShape(dst, dstT, target, shape);
    expect(points).not.toBeNull();
    const after = captureEdgeShape({ ...dst, points: points ?? [] }, dstT, target);
    expect(after).not.toBeNull();
    if (!after) {return;}
    expectClose(after.start, shape.start);
    expectClose(after.startHandle, shape.startHandle);
    expectClose(after.end, shape.end);
    expectClose(after.endHandle, shape.endHandle);
  });

  it('picks the direction with the nearest end points', () => {
    const shape = {
      start: { x: 0, y: 0, z: 0 }, startHandle: { x: 0.3, y: 0, z: 0 },
      end: { x: 1, y: 0, z: 0 }, endHandle: { x: 0.7, y: 0, z: 0 },
    };
    expect(shouldReverseForTarget(shape, shape)).toBe(false);
    expect(shouldReverseForTarget(shape, reverseEdgeShape(shape))).toBe(true);
  });
});

describe('edge links', () => {
  function linkedPair(flip = false) {
    const a = defaultPatchParamsForKind('triangle-patch');
    const b = defaultPatchParamsForKind('triangle-patch');
    const l = link(a, 'B', b, 0, 1, flip);
    const A = patchEntity('A', { ...a, edgeLinks: [l] });
    const B = patchEntity('B', { ...b, edgeLinks: [backLink(l, 'A')] }, {
      position: { x: 3, y: 0, z: 0 }, rotation: { x: 0, y: 1, z: 0 },
    });
    return { A, B, l };
  }

  it('ignores links whose partner is gone or whose segment was split', () => {
    const { A, B, l } = linkedPair();
    expect(isEdgeLinkValid(A, l, () => undefined)).toBe(false);
    const split = insertPatchPoint(B.patchParams!, 1, 0.5).params;
    const B2 = { ...B, patchParams: split };
    expect(isEdgeLinkValid(A, l, (id) => (id === 'B' ? B2 : undefined))).toBe(false);
  });

  it('removing a point drops the links that touch it', () => {
    const params = insertPatchPoint(defaultPatchParamsForKind('triangle-patch'), 0, 0.5).params;
    const inserted = params.points[1];
    const withLink: PatchParams = {
      ...params,
      edgeLinks: [{ startPointId: params.points[0].id, endPointId: inserted.id, partnerEntityId: 'X', partnerStartPointId: 'a', partnerEndPointId: 'b' }],
    };
    expect(removePatchPoint(withLink, inserted.id).edgeLinks).toEqual([]);
  });
});
