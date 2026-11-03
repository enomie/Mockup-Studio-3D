import type { PatchParams } from './asset-triangle-patch';
import type { AssetEntity } from './entity-types';
import { isEdgeLinkValid, isSameSegment, type PatchEdgeLink } from './triangle-patch-edge-link';
import {
  insertPatchPointInSegment,
  removePatchPoint,
  type InsertedPatchPoint,
} from './triangle-patch-point-edit';

/** New params for the edited patch and its partner after a linked edit. */
export interface LinkedEditResult {
  ownerParams: PatchParams;
  partnerId: string;
  partnerParams: PatchParams;
}

type FindEntity = (id: string) => AssetEntity | undefined;

function linkBetween(
  startPointId: string,
  endPointId: string,
  partnerEntityId: string,
  partnerStartPointId: string,
  partnerEndPointId: string,
): PatchEdgeLink {
  return { startPointId, endPointId, partnerEntityId, partnerStartPointId, partnerEndPointId };
}

/** A partner patch split along with the owner: its new params and the new point there. */
export interface SplitPartner {
  partnerId: string;
  partnerParams: PatchParams;
  pointId: string;
}

/** New params for the edited patch and every linked partner after an insert. */
export interface LinkedSplitResult {
  ownerParams: PatchParams;
  partners: SplitPartner[];
}

/**
 * After `insert` split a segment of `owner` (owner.patchParams is the state before the
 * insert): every partner validly linked on that segment (one at a seam, several at a
 * T-joint) is split at the same curve parameter, and each link turns into two on both
 * sides. Null when the segment is not linked.
 */
export function splitLinkOnInsert(
  owner: AssetEntity,
  insert: InsertedPatchPoint,
  findEntity: FindEntity,
): LinkedSplitResult | null {
  const segment = { startPointId: insert.startPointId, endPointId: insert.endPointId };
  const links = (owner.patchParams?.edgeLinks ?? [])
    .filter((l) => isSameSegment(l, segment) && isEdgeLinkValid(owner, l, findEntity));
  if (links.length === 0) {return null;}

  const p = insert.pointId;
  const ownerLinks = (insert.params.edgeLinks ?? []).filter((l) => !isSameSegment(l, segment));
  const partners: SplitPartner[] = [];
  for (const link of links) {
    const partner = findEntity(link.partnerEntityId);
    const partnerBefore = partner?.patchParams;
    if (!partner || !partnerBefore) {continue;}
    // Split parameter measured from the link's start point, then applied from the partner's start.
    const sFromLinkStart = link.startPointId === insert.startPointId ? insert.s : 1 - insert.s;
    const partnerInsert = insertPatchPointInSegment(
      partnerBefore,
      link.partnerStartPointId,
      link.partnerEndPointId,
      sFromLinkStart,
    );
    if (!partnerInsert) {continue;}
    const q = partnerInsert.pointId;
    ownerLinks.push(
      linkBetween(link.startPointId, p, partner.id, link.partnerStartPointId, q),
      linkBetween(p, link.endPointId, partner.id, q, link.partnerEndPointId),
    );
    const partnerSegment = { startPointId: link.partnerStartPointId, endPointId: link.partnerEndPointId };
    const partnerLinks = [
      // Links of the partner's segment to other patches (it may itself be a T-joint) are
      // only kept when they point to patches split here too.
      ...(partnerInsert.params.edgeLinks ?? []).filter((l) => !isSameSegment(l, partnerSegment)),
      linkBetween(link.partnerStartPointId, q, owner.id, link.startPointId, p),
      linkBetween(q, link.partnerEndPointId, owner.id, p, link.endPointId),
    ];
    partners.push({ partnerId: partner.id, partnerParams: smooth({ ...partnerInsert.params, edgeLinks: partnerLinks }, q), pointId: q });
  }
  if (partners.length === 0) {return null;}

  // Partners linked with each other on the same edge (T-joint between them) relink at the split.
  for (const a of partners) {
    for (const b of partners) {
      if (a === b) {continue;}
      const aBefore = findEntity(a.partnerId)?.patchParams;
      const cross = (aBefore?.edgeLinks ?? []).filter((l) => l.partnerEntityId === b.partnerId &&
        links.some((own) => own.partnerEntityId === a.partnerId && isSameSegment(l, {
          startPointId: own.partnerStartPointId, endPointId: own.partnerEndPointId,
        })));
      for (const l of cross) {
        a.partnerParams = {
          ...a.partnerParams,
          edgeLinks: [
            ...(a.partnerParams.edgeLinks ?? []),
            linkBetween(l.startPointId, a.pointId, b.partnerId, l.partnerStartPointId, b.pointId),
            linkBetween(a.pointId, l.endPointId, b.partnerId, b.pointId, l.partnerEndPointId),
          ],
        };
      }
    }
  }
  return { ownerParams: smooth({ ...insert.params, edgeLinks: ownerLinks }, p), partners };
}

function smooth(params: PatchParams, id: string): PatchParams {
  return {
    ...params,
    points: params.points.map((point) => (point.id === id ? { ...point, joint: 'smooth' as const, pinkPair: 'coupled' as const } : point)),
  };
}

/**
 * Removing `pointId` from `owner`: when it is the shared middle of two valid links to the
 * same partner that meet at the same partner point, removes that point too and merges the
 * two links into one. Null when this does not apply (plain removal then).
 */
export function mergeLinksOnRemove(
  owner: AssetEntity,
  pointId: string,
  findEntity: FindEntity,
): LinkedEditResult | null {
  const params = owner.patchParams;
  if (!params) {return null;}
  const touching = (params.edgeLinks ?? []).filter(
    (l) => (l.startPointId === pointId || l.endPointId === pointId) && isEdgeLinkValid(owner, l, findEntity),
  );
  if (touching.length !== 2 || touching[0].partnerEntityId !== touching[1].partnerEntityId) {return null;}

  // Orient both links so the removed point is their end (first) / start (second).
  const orient = (l: PatchEdgeLink, pointAtEnd: boolean): PatchEdgeLink => {
    const isEnd = l.endPointId === pointId;
    if (isEnd === pointAtEnd) {return l;}
    return linkBetween(l.endPointId, l.startPointId, l.partnerEntityId, l.partnerEndPointId, l.partnerStartPointId);
  };
  const first = orient(touching[0], true);
  const second = orient(touching[1], false);
  const partnerPoint = first.partnerEndPointId;
  if (second.partnerStartPointId !== partnerPoint) {return null;}

  const partner = findEntity(first.partnerEntityId);
  const partnerParams = partner?.patchParams;
  if (!partner || !partnerParams) {return null;}
  const partnerAfter = removePatchPoint(partnerParams, partnerPoint);
  if (partnerAfter === partnerParams) {return null;} // corner on the partner side
  const ownerAfter = removePatchPoint(params, pointId);
  if (ownerAfter === params) {return null;}

  const merged = linkBetween(first.startPointId, second.endPointId, partner.id, first.partnerStartPointId, second.partnerEndPointId);
  const back = linkBetween(first.partnerStartPointId, second.partnerEndPointId, owner.id, first.startPointId, second.endPointId);
  return {
    ownerParams: { ...ownerAfter, edgeLinks: [...(ownerAfter.edgeLinks ?? []), merged] },
    partnerId: partner.id,
    partnerParams: { ...partnerAfter, edgeLinks: [...(partnerAfter.edgeLinks ?? []), back] },
  };
}
