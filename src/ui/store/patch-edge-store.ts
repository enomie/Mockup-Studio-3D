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

/** Same link (both segments, same partner). */
function sameLink(a: PatchEdgeLink, b: PatchEdgeLink): boolean {
  return a.partnerEntityId === b.partnerEntityId && isSameSegment(a, b) && isSameSegment(
    { startPointId: a.partnerStartPointId, endPointId: a.partnerEndPointId },
    { startPointId: b.partnerStartPointId, endPointId: b.partnerEndPointId },
  );
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

  // Joining: the end points become shared points. Points that already are shared keep
  // their place (earlier seams stay closed); a segment may link to several patches.
  store.sceneApi?.joinPatchEdges(source.entity.id, clip.segment, entityId, oriented);
  return true;
}

/**
 * Removes one link (both directions). Shared end points stay shared where either patch
 * still has another linked segment there (other seams, T-joints).
 */
export function unlinkPatchEdge(entityId: string, link: PatchEdgeLink): void {
  const owner = findPatch(entityId);
  if (!owner) {return;}
  const partner = findPatch(link.partnerEntityId);
  const back: PatchEdgeLink = {
    startPointId: link.partnerStartPointId,
    endPointId: link.partnerEndPointId,
    partnerEntityId: entityId,
    partnerStartPointId: link.startPointId,
    partnerEndPointId: link.endPointId,
  };
  const ownLinks = (owner.params.edgeLinks ?? []).filter((l) => !sameLink(l, link));
  const partnerLinks = (partner?.params.edgeLinks ?? []).filter((l) => !sameLink(l, back));
  const touches = (links: readonly PatchEdgeLink[], id: string) =>
    links.some((l) => l.startPointId === id || l.endPointId === id);
  const pairs: [string, string][] = [
    [link.startPointId, link.partnerStartPointId],
    [link.endPointId, link.partnerEndPointId],
  ];
  const ownIds = pairs.filter(([id]) => !touches(ownLinks, id)).map(([id]) => id);
  const partnerIds = pairs.filter(([, pid]) => !touches(partnerLinks, pid)).map(([, pid]) => pid);
  setKindParams('patch', entityId, { points: withoutNodes(owner.params.points, ownIds), edgeLinks: ownLinks });
  if (partner) {
    setKindParams('patch', partner.entity.id, {
      points: withoutNodes(partner.params.points, partnerIds),
      edgeLinks: partnerLinks,
    });
  }
}

function withoutNodes(points: readonly PatchPoint[], ids: readonly string[]): PatchPoint[] {
  return points.map((point) => {
    if (!ids.includes(point.id) || !point.nodeId) {return point;}
    const { nodeId: _node, ...rest } = point;
    return rest;
  });
}

/** Makes this seam the smooth one at a T-joint (the other patches on the edge may crease). */
export function setPatchSmoothSeam(entityId: string, link: PatchEdgeLink): void {
  store.sceneApi?.setPatchSmoothSeam(entityId, link);
}

/** Sets one handle of a shared point (world offset); coupled pairs turn along. */
export function setPatchNodeSlot(nodeId: string, slot: string, worldOffset: { x: number; y: number; z: number }): void {
  store.sceneApi?.setPatchNodeSlot(nodeId, slot, worldOffset, false);
}

/** "Align handles opposite" on a shared point. */
export function alignPatchNode(nodeId: string): void {
  store.sceneApi?.alignPatchNode(nodeId);
}
