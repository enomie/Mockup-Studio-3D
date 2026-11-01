import type { AssetEntity } from './entity-types';
import type { PatchNode } from './patch-nodes';

export interface RemappedArrangement {
  entities: AssetEntity[];
  patchNodes: PatchNode[];
}

/**
 * Gives every entity and shared patch point (node) of a stored arrangement a fresh id and
 * rewrites all references (node uses, PatchPoint.nodeId, edge-link partners), so the same
 * arrangement can be loaded any number of times. References to missing entities or nodes
 * are dropped: the point stays where it was stored, only unlinked.
 */
export function remapArrangementIds(
  entities: readonly AssetEntity[],
  patchNodes: readonly PatchNode[],
  createId: () => string = () => crypto.randomUUID(),
): RemappedArrangement {
  const entityIds = new Map(entities.map((entity) => [entity.id, createId()]));

  const nodeIds = new Map<string, string>();
  const nextNodes: PatchNode[] = [];
  for (const node of patchNodes) {
    const uses = node.uses
      .filter((use) => entityIds.has(use.entityId))
      .map((use) => ({ ...use, entityId: entityIds.get(use.entityId) ?? use.entityId }));
    if (uses.length < 2) {continue;}
    const id = createId();
    nodeIds.set(node.id, id);
    nextNodes.push({ ...node, id, uses });
  }

  const nextEntities = entities.map((entity): AssetEntity => {
    const id = entityIds.get(entity.id) ?? entity.id;
    const params = entity.patchParams;
    if (!params) {return { ...entity, id };}

    const points = params.points.map((point) => {
      if (point.nodeId === undefined) {return point;}
      const nodeId = nodeIds.get(point.nodeId);
      if (nodeId) {return { ...point, nodeId };}
      const { nodeId: _drop, ...rest } = point;
      return rest;
    });
    const edgeLinks = params.edgeLinks
      ?.filter((link) => entityIds.has(link.partnerEntityId))
      .map((link) => ({ ...link, partnerEntityId: entityIds.get(link.partnerEntityId) ?? link.partnerEntityId }));

    const patchParams = { ...params, points };
    if (params.edgeLinks) {
      if (edgeLinks && edgeLinks.length > 0) {patchParams.edgeLinks = edgeLinks;} else {delete patchParams.edgeLinks;}
    }
    return { ...entity, id, patchParams };
  });

  return { entities: nextEntities, patchNodes: nextNodes };
}
