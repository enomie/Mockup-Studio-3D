import { useSyncExternalStore } from 'react';
import {
  defaultPatchParamsForKind,
  isPatchAssetKind,
  type PatchParams,
  type PatchPoint,
} from '@/scene/asset-triangle-patch';
import type { AssetEntity } from '@/scene/entity-types';
import {
  applyEdgeShape,
  captureEdgeShape,
  isSameSegment,
  shouldReverseForTarget,
  type EdgeShape,
  type PatchEdgeLink,
  type PatchSegment,
} from '@/scene/triangle-patch-edge-link';
import type { PatchEdgeSelection } from '@/engine/triangle-patch-add-point-tool';
import { alignSharedPairAverage, type HandlePair } from '@/scene/triangle-patch-coupled-pairs';
import { setKindParams } from './app-store-asset-params';
import * as store from './app-store-internals';

/** A copied patch edge: its world-space shape plus where it came from (for linking). */
export interface PatchEdgeClipboard {
  sourceEntityId: string;
  segment: PatchSegment;
  shape: EdgeShape;
  label: string;
}

let clipboard: PatchEdgeClipboard | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getPatchEdgeClipboard(): PatchEdgeClipboard | null {
  return clipboard;
}

export function setPatchEdgeClipboard(next: PatchEdgeClipboard | null): void {
  clipboard = next;
  for (const listener of listeners) {listener();}
}

export function usePatchEdgeClipboard(): PatchEdgeClipboard | null {
  return useSyncExternalStore(subscribe, getPatchEdgeClipboard);
}

export function setPatchEdgePickMode(entityId: string | null): void {
  store.sceneApi?.setPatchEdgePickMode(entityId);
}

export function selectPatchEdge(selection: PatchEdgeSelection | null): void {
  store.sceneApi?.selectPatchEdge(selection);
}

function findPatch(entityId: string): { entity: AssetEntity; params: PatchParams } | null {
  const entity = store.state.entities.find((e) => e.id === entityId);
  if (!entity || !isPatchAssetKind(entity.assetKind)) {return null;}
  return { entity, params: entity.patchParams ?? defaultPatchParamsForKind(entity.assetKind) };
}

function pointName(params: PatchParams, id: string): string {
  return params.points.find((p) => p.id === id)?.name ?? id;
}

export function segmentLabel(params: PatchParams, segment: PatchSegment): string {
  return `${pointName(params, segment.startPointId)} – ${pointName(params, segment.endPointId)}`;
}

export function copyPatchEdge(entityId: string, segment: PatchSegment): boolean {
  const found = findPatch(entityId);
  const shape = found ? captureEdgeShape(found.params, found.entity.transform, segment) : null;
  if (!found || !shape) {return false;}
  setPatchEdgeClipboard({
    sourceEntityId: entityId,
    segment,
    shape,
    label: `${found.entity.name} · ${segmentLabel(found.params, segment)}`,
  });
  return true;
}

/** Links on `params` without any link that uses `segment` (either direction). */
function withoutSegmentLinks(params: PatchParams, segment: PatchSegment): PatchEdgeLink[] {
  return (params.edgeLinks ?? []).filter((link) => !isSameSegment(link, segment));
}

/** Removes the back link of every link that `segment` has on `entityId`. */
function detachPartners(entityId: string, params: PatchParams, segment: PatchSegment): void {
  for (const link of params.edgeLinks ?? []) {
    if (!isSameSegment(link, segment)) {continue;}
    const partner = findPatch(link.partnerEntityId);
    if (!partner) {continue;}
    const edgeLinks = (partner.params.edgeLinks ?? []).filter((back) =>
      !(back.partnerEntityId === entityId && isSameSegment(back, {
        startPointId: link.partnerStartPointId,
        endPointId: link.partnerEndPointId,
      })),
    );
    setKindParams('patch', partner.entity.id, { edgeLinks });
  }
}

/**
 * Pastes the copied edge onto `segment` of `entityId`. Direction follows the nearest end
 * points. With `link`, both patches keep the edges together from now on.
 */
export function pastePatchEdge(entityId: string, segment: PatchSegment, link: boolean): boolean {
  const clip = clipboard;
  const target = findPatch(entityId);
  if (!clip || !target) {return false;}
  const targetShape = captureEdgeShape(target.params, target.entity.transform, segment);
  if (!targetShape) {return false;}

  // Orient the target segment so its start matches the copied start.
  const oriented: PatchSegment = shouldReverseForTarget(clip.shape, targetShape)
    ? { startPointId: segment.endPointId, endPointId: segment.startPointId }
    : segment;

  const source = link ? findPatch(clip.sourceEntityId) : null;
  const liveShape = source ? captureEdgeShape(source.params, source.entity.transform, clip.segment) : null;
  if (link && (!source || !liveShape || clip.sourceEntityId === entityId)) {return false;}

  const points = applyEdgeShape(target.params, target.entity.transform, oriented, liveShape ?? clip.shape);
  if (!points) {return false;}

  if (!link || !source) {
    setKindParams('patch', entityId, { points });
    return true;
  }

  // Joining: the 4 end points become 2 shared points used by both patches (average,
  // all handles opposite). The copied side's segment pairs with the oriented target.
  detachPartners(entityId, target.params, segment);
  detachPartners(source.entity.id, source.params, clip.segment);
  store.sceneApi?.joinPatchEdges(source.entity.id, clip.segment, entityId, oriented);
  return true;
}

/** Puts one pair at a shared point opposite on the average direction and couples it (both patches). */
function alignPair(entityId: string, pointId: string, pair: HandlePair): void {
  const updates = alignSharedPairAverage(entityId, pointId, pair, (id) => store.state.entities.find((e) => e.id === id));
  for (const [id, points] of updates) {setKindParams('patch', id, { points });}
}

/**
 * Couples a pair at a shared point (opposite on the average direction = "Align opposite
 * (average)") or frees it. The state is the same on both patches.
 */
export function setSharedPair(entityId: string, pointId: string, pair: HandlePair, coupled: boolean): void {
  if (coupled) {
    alignPair(entityId, pointId, pair);
  } else {
    const owner = findPatch(entityId);
    if (!owner) {return;}
    setKindParams('patch', entityId, {
      points: owner.params.points.map((point) => (point.id !== pointId
        ? point
        : pair === 'yellow' ? { ...point, joint: 'corner' as const } : { ...point, pinkPair: 'free' as const })),
    });
  }
  store.sceneApi?.syncPatchLinksFrom(entityId);
}

export function unlinkPatchEdge(entityId: string, link: PatchEdgeLink): void {
  const owner = findPatch(entityId);
  if (!owner) {return;}
  const segment = { startPointId: link.startPointId, endPointId: link.endPointId };
  detachPartners(entityId, owner.params, segment);
  const remaining = withoutSegmentLinks(owner.params, segment);
  // Shared points at the ends become separate points again (one per patch), unless they
  // still belong to another joined segment. The node dissolves once no patch uses it.
  const pairs: [string, string][] = [
    [link.startPointId, link.partnerStartPointId],
    [link.endPointId, link.partnerEndPointId],
  ];
  const stillShared = (id: string) => remaining.some((l) => l.startPointId === id || l.endPointId === id);
  const ownIds = pairs.filter(([id]) => !stillShared(id)).map(([id]) => id);
  const partnerIds = pairs.filter(([id]) => !stillShared(id)).map(([, pid]) => pid);
  setKindParams('patch', entityId, { points: withoutNodes(owner.params.points, ownIds), edgeLinks: remaining });
  const partner = findPatch(link.partnerEntityId);
  if (partner) {
    setKindParams('patch', partner.entity.id, { points: withoutNodes(partner.params.points, partnerIds) });
  }
}

function withoutNodes(points: readonly PatchPoint[], ids: readonly string[]): PatchPoint[] {
  return points.map((point) => {
    if (!ids.includes(point.id) || !point.nodeId) {return point;}
    const { nodeId: _node, ...rest } = point;
    return rest;
  });
}

/** Reverses which ends belong together; this patch keeps its edge, the partner follows. */
export function flipPatchEdgeLink(entityId: string, link: PatchEdgeLink): void {
  const owner = findPatch(entityId);
  const partner = findPatch(link.partnerEntityId);
  if (!owner || !partner) {return;}
  const segment = { startPointId: link.startPointId, endPointId: link.endPointId };
  const flipped: PatchEdgeLink = {
    ...link,
    partnerStartPointId: link.partnerEndPointId,
    partnerEndPointId: link.partnerStartPointId,
  };
  const partnerSegment = { startPointId: flipped.partnerStartPointId, endPointId: flipped.partnerEndPointId };
  const back: PatchEdgeLink = {
    startPointId: flipped.partnerStartPointId,
    endPointId: flipped.partnerEndPointId,
    partnerEntityId: entityId,
    partnerStartPointId: link.startPointId,
    partnerEndPointId: link.endPointId,
  };
  const shape = captureEdgeShape(owner.params, owner.entity.transform, segment);
  const points = shape ? applyEdgeShape(partner.params, partner.entity.transform, partnerSegment, shape) : null;

  setKindParams('patch', entityId, {
    edgeLinks: [...withoutSegmentLinks(owner.params, segment), flipped],
  });
  setKindParams('patch', partner.entity.id, {
    ...(points ? { points } : {}),
    edgeLinks: [...withoutSegmentLinks(partner.params, partnerSegment), back],
  });
}

/** Sets one handle of a shared point (world offset); coupled pairs turn along. */
export function setPatchNodeSlot(nodeId: string, slot: string, worldOffset: { x: number; y: number; z: number }): void {
  store.sceneApi?.setPatchNodeSlot(nodeId, slot, worldOffset, false);
}

/** "Align handles opposite" on a shared point. */
export function alignPatchNode(nodeId: string): void {
  store.sceneApi?.alignPatchNode(nodeId);
}
