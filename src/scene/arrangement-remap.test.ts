import { describe, expect, it } from 'vitest';
import { defaultPatchParamsForKind } from './asset-triangle-patch';
import type { AssetEntity, EntityTransform, Vec3 } from './entity-types';
import { remapArrangementIds } from './arrangement-remap';
import { joinSharedEdge, reconcilePatchNodes } from './patch-nodes';
import { listPatchSegments } from './triangle-patch-edge-link';

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

function patch(id: string, transform: EntityTransform): AssetEntity {
  return {
    id, type: 'asset', name: id, assetKind: 'triangle-patch', screenImageId: null, sizeScale: 1, visible: true,
    transform, patchParams: defaultPatchParamsForKind('triangle-patch'),
  };
}

/** Two patches sharing one edge (two nodes), plus edge links on both sides. */
function joinedScene() {
  const A = patch('A', { position: v(0, 0, 0), rotation: v(0, 0, 0) });
  const B = patch('B', { position: v(0.3, 0.05, 0.2), rotation: v(0, 0.9, 0.1) });
  const segA = listPatchSegments(A.patchParams!)[0];
  const segB = listPatchSegments(B.patchParams!)[1];
  let n = 0;
  const result = joinSharedEdge(
    { entity: A, segment: segA },
    { entity: B, segment: { startPointId: segB.endPointId, endPointId: segB.startPointId } },
    () => `node-${++n}`,
  );
  if (!result) {throw new Error('join failed');}
  const entities = [
    { ...A, patchParams: result.aParams },
    { ...B, patchParams: result.bParams },
  ];
  return { entities, nodes: result.nodes };
}

function counter(prefix: string) {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

function allReferencedIds(entities: readonly AssetEntity[]): string[] {
  return entities.flatMap((entity) => [
    ...(entity.patchParams?.points.flatMap((p) => (p.nodeId ? [p.nodeId] : [])) ?? []),
    ...(entity.patchParams?.edgeLinks?.map((link) => link.partnerEntityId) ?? []),
  ]);
}

describe('remapArrangementIds', () => {
  it('gives entities and nodes fresh ids and keeps every reference consistent', () => {
    const { entities, nodes } = joinedScene();
    const out = remapArrangementIds(entities, nodes, counter('new'));

    const newEntityIds = new Set(out.entities.map((e) => e.id));
    const newNodeIds = new Set(out.patchNodes.map((node) => node.id));
    expect(out.patchNodes).toHaveLength(nodes.length);
    for (const id of ['A', 'B', ...nodes.map((node) => node.id)]) {
      expect(newEntityIds.has(id) || newNodeIds.has(id)).toBe(false);
      expect(allReferencedIds(out.entities)).not.toContain(id);
    }
    for (const node of out.patchNodes) {
      for (const use of node.uses) {
        expect(newEntityIds.has(use.entityId)).toBe(true);
        const entity = out.entities.find((e) => e.id === use.entityId);
        const point = entity?.patchParams?.points.find((p) => p.id === use.pointId);
        expect(point?.nodeId).toBe(node.id);
      }
    }
    // Consistent result: the node sync finds nothing to fix or dissolve.
    const reconciled = reconcilePatchNodes(new Map(), out.entities, out.patchNodes);
    expect(reconciled.nodes).toBeNull();
    expect(reconciled.points.size).toBe(0);
  });

  it('remaps edge-link partners to the new patch ids', () => {
    const { entities, nodes } = joinedScene();
    const out = remapArrangementIds(entities, nodes, counter('new'));
    const ids = new Set(out.entities.map((e) => e.id));
    expect(out.entities.every((entity) => (entity.patchParams?.edgeLinks?.length ?? 0) > 0)).toBe(true);
    for (const entity of out.entities) {
      for (const link of entity.patchParams?.edgeLinks ?? []) {
        expect(ids.has(link.partnerEntityId)).toBe(true);
        expect(link.partnerEntityId).not.toBe(entity.id);
      }
    }
  });

  it('loading twice never reuses ids', () => {
    const { entities, nodes } = joinedScene();
    const createId = counter('id');
    const first = remapArrangementIds(entities, nodes, createId);
    const second = remapArrangementIds(entities, nodes, createId);
    const ids = (r: typeof first) => [...r.entities.map((e) => e.id), ...r.patchNodes.map((n) => n.id)];
    const overlap = ids(first).filter((id) => ids(second).includes(id));
    expect(overlap).toEqual([]);
  });

  it('unlinks points whose node was not stored (older arrangements)', () => {
    const { entities } = joinedScene();
    const out = remapArrangementIds(entities, [], counter('new'));
    expect(out.patchNodes).toEqual([]);
    for (const entity of out.entities) {
      expect(entity.patchParams?.points.some((p) => p.nodeId !== undefined)).toBe(false);
    }
    const before = entities[0].patchParams.points.map((p) => p.pos);
    expect(out.entities[0].patchParams!.points.map((p) => p.pos)).toEqual(before);
  });
});
