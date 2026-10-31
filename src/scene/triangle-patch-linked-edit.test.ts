import { describe, expect, it } from 'vitest';
import { defaultPatchParamsForKind, type PatchParams } from './asset-triangle-patch';
import type { AssetEntity, EntityTransform } from './entity-types';
import {
  captureEdgeShape,
  isEdgeLinkValid,
  listPatchSegments,
  applyEdgeShape,
  type PatchEdgeLink,
} from './triangle-patch-edge-link';
import { mergeLinksOnRemove, splitLinkOnInsert } from './triangle-patch-linked-edit';
import { insertPatchPoint, insertPatchPointInSegment } from './triangle-patch-point-edit';

function patchEntity(id: string, params: PatchParams, transform: EntityTransform): AssetEntity {
  return { id, type: 'asset', name: id, assetKind: 'triangle-patch', screenImageId: null, sizeScale: 1, visible: true, transform, patchParams: params };
}

/** A linked to B on A's first segment and B's second segment (optionally reversed), B already synced. */
function linkedPair(reverse: boolean) {
  const a = defaultPatchParamsForKind('triangle-patch');
  const b = defaultPatchParamsForKind('triangle-patch');
  const sa = listPatchSegments(a)[0];
  const sb = listPatchSegments(b)[1];
  const l: PatchEdgeLink = {
    startPointId: sa.startPointId,
    endPointId: sa.endPointId,
    partnerEntityId: 'B',
    partnerStartPointId: reverse ? sb.endPointId : sb.startPointId,
    partnerEndPointId: reverse ? sb.startPointId : sb.endPointId,
  };
  const back: PatchEdgeLink = {
    startPointId: l.partnerStartPointId, endPointId: l.partnerEndPointId, partnerEntityId: 'A',
    partnerStartPointId: l.startPointId, partnerEndPointId: l.endPointId,
  };
  const A = patchEntity('A', { ...a, edgeLinks: [l] }, { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
  let B = patchEntity('B', { ...b, edgeLinks: [back] }, { position: { x: 2, y: 0, z: 1 }, rotation: { x: 0, y: 0.7, z: 0 } });
  // Same shared edge in world space on both sides.
  const shape = captureEdgeShape(A.patchParams!, A.transform, { startPointId: l.startPointId, endPointId: l.endPointId });
  const synced = shape ? applyEdgeShape(B.patchParams!, B.transform, { startPointId: l.partnerStartPointId, endPointId: l.partnerEndPointId }, shape) : null;
  if (synced) {B = { ...B, patchParams: { ...(B.patchParams!), points: synced } };}
  return { A, B };
}

function worldOf(entity: AssetEntity, pointId: string) {
  const params = entity.patchParams!;
  const ids = params.points.map((p) => p.id);
  const i = ids.indexOf(pointId);
  const next = ids[(i + 1) % ids.length];
  return captureEdgeShape(params, entity.transform, { startPointId: pointId, endPointId: next })?.start;
}

describe('insert on a linked edge', () => {
  for (const reverse of [false, true]) {
    it(`creates the matching partner point and splits the link (reverse=${String(reverse)})`, () => {
      const { A, B } = linkedPair(reverse);
      const find = (id: string) => (id === 'A' ? A : id === 'B' ? B : undefined);
      const inserted = insertPatchPoint(A.patchParams!, 0, 0.3);
      const result = splitLinkOnInsert(A, inserted, find);
      expect(result).not.toBeNull();
      if (!result) {return;}
      const A2 = { ...A, patchParams: result.ownerParams };
      const B2 = { ...B, patchParams: result.partnerParams };
      expect(A2.patchParams.points).toHaveLength(4);
      expect(B2.patchParams.points).toHaveLength(4);
      expect(A2.patchParams.edgeLinks).toHaveLength(2);
      expect(B2.patchParams.edgeLinks).toHaveLength(2);
      const find2 = (id: string) => (id === 'A' ? A2 : id === 'B' ? B2 : undefined);
      for (const l of A2.patchParams.edgeLinks ?? []) {expect(isEdgeLinkValid(A2, l, find2)).toBe(true);}

      const newLink = (A2.patchParams.edgeLinks ?? []).find((l) => l.endPointId === inserted.pointId);
      if (!newLink) {throw new Error('missing split link');}
      const p = worldOf(A2, inserted.pointId);
      const q = worldOf(B2, newLink.partnerEndPointId);
      if (!p || !q) {throw new Error('missing point');}
      expect(q.x).toBeCloseTo(p.x, 6);
      expect(q.y).toBeCloseTo(p.y, 6);
      expect(q.z).toBeCloseTo(p.z, 6);
      // The new shared point starts smooth on both sides.
      expect(A2.patchParams.points.find((pt) => pt.id === inserted.pointId)?.joint).toBe('smooth');
      expect(B2.patchParams.points.find((pt) => pt.id === newLink.partnerEndPointId)?.joint).toBe('smooth');
    });
  }

  it('does nothing special on an unlinked edge', () => {
    const { A, B } = linkedPair(false);
    const inserted = insertPatchPoint(A.patchParams!, 1, 0.5);
    expect(splitLinkOnInsert(A, inserted, (id) => (id === 'B' ? B : A))).toBeNull();
  });
});

describe('remove on a linked edge', () => {
  it('removes the shared point on both sides and merges the links', () => {
    const { A, B } = linkedPair(true);
    const find = (id: string) => (id === 'A' ? A : id === 'B' ? B : undefined);
    const inserted = insertPatchPoint(A.patchParams!, 0, 0.5);
    const split = splitLinkOnInsert(A, inserted, find);
    if (!split) {throw new Error('split failed');}
    const A2 = { ...A, patchParams: split.ownerParams };
    const B2 = { ...B, patchParams: split.partnerParams };
    const find2 = (id: string) => (id === 'A' ? A2 : id === 'B' ? B2 : undefined);

    const merged = mergeLinksOnRemove(A2, inserted.pointId, find2);
    if (!merged) {throw new Error('merge failed');}
    const A3 = { ...A2, patchParams: merged.ownerParams };
    const B3 = { ...B2, patchParams: merged.partnerParams };
    expect(A3.patchParams.points).toHaveLength(3);
    expect(B3.patchParams.points).toHaveLength(3);
    expect(A3.patchParams.edgeLinks).toHaveLength(1);
    expect(B3.patchParams.edgeLinks).toHaveLength(1);
    const find3 = (id: string) => (id === 'A' ? A3 : id === 'B' ? B3 : undefined);
    expect(isEdgeLinkValid(A3, (A3.patchParams.edgeLinks ?? [])[0], find3)).toBe(true);
  });

  it('falls back to plain removal when only one link touches the point', () => {
    const { A, B } = linkedPair(false);
    const inserted = insertPatchPoint(A.patchParams!, 1, 0.5);
    const A2 = { ...A, patchParams: inserted.params };
    expect(mergeLinksOnRemove(A2, inserted.pointId, (id) => (id === 'B' ? B : A2))).toBeNull();
  });
});

describe('insertPatchPointInSegment', () => {
  it('splits the same curve point from either direction', () => {
    const params = defaultPatchParamsForKind('quad-patch');
    const [a, b] = listPatchSegments(params).map((s) => s)[2] ? [listPatchSegments(params)[2].startPointId, listPatchSegments(params)[2].endPointId] : ['', ''];
    const one = insertPatchPointInSegment(params, a, b, 0.3);
    const two = insertPatchPointInSegment(params, b, a, 0.7);
    if (!one || !two) {throw new Error('insert failed');}
    const p1 = one.params.points.find((p) => p.id === one.pointId);
    const p2 = two.params.points.find((p) => p.id === two.pointId);
    expect(p1?.pos.x).toBeCloseTo(p2?.pos.x ?? NaN, 9);
    expect(p1?.pos.z).toBeCloseTo(p2?.pos.z ?? NaN, 9);
  });
});
