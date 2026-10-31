import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { defaultPatchParamsForKind, type PatchPoint } from './asset-triangle-patch';
import type { AssetEntity, EntityTransform, Vec3 } from './entity-types';
import {
  alignNodeOpposite,
  applyPointEditToNode,
  joinSharedEdge,
  moveNodeWithPatch,
  extraSlotsFor,
  nextSharedNodeName,
  reconcilePatchNodes,
  setNodeSlot,
  removeNodeUse,
  resolvePatchPoints,
  type PatchNode,
} from './patch-nodes';
import { listPatchSegments } from './triangle-patch-edge-link';

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

function worldOf(p: Vec3, t: EntityTransform): Vector3 {
  const q = new Quaternion().setFromEuler(new Euler(t.rotation.x, t.rotation.y, t.rotation.z, 'XYZ'));
  return new Vector3(p.x, p.y, p.z).applyQuaternion(q).add(new Vector3(t.position.x, t.position.y, t.position.z));
}

function patch(id: string, transform: EntityTransform): AssetEntity {
  return {
    id, type: 'asset', name: id, assetKind: 'triangle-patch', screenImageId: null, sizeScale: 1, visible: true,
    transform, patchParams: defaultPatchParamsForKind('triangle-patch'),
  };
}

function joined() {
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
  return { A: { ...A, patchParams: result.aParams }, B: { ...B, patchParams: result.bParams }, nodes: result.nodes, segA, segB };
}

const pt = (e: AssetEntity, id: string) => (e.patchParams!).points.find((p) => p.id === id)!;

describe('shared nodes', () => {
  it('joining two edges turns 4 points into 2 nodes used by both patches', () => {
    const { A, B, nodes, segA, segB } = joined();
    expect(nodes).toHaveLength(2);
    for (const node of nodes) {expect(node.uses.map((u) => u.entityId).sort()).toEqual(['A', 'B']);}
    // A's start and B's (reversed) start are the same node at the same world position.
    const a0 = pt(A, segA.startPointId);
    const b0 = pt(B, segB.endPointId);
    expect(a0.nodeId).toBe(b0.nodeId);
    expect(worldOf(a0.pos, A.transform).distanceTo(worldOf(b0.pos, B.transform))).toBeLessThan(1e-9);
    // One name per point.
    expect(a0.name).toBe(b0.name);
    // The shared edge handle is one handle: same world direction from both patches.
    const along = (e: AssetEntity, p: PatchPoint, key: 'handleNext' | 'handlePrev') =>
      worldOf(p[key], e.transform).sub(worldOf(p.pos, e.transform));
    expect(along(A, a0, 'handleNext').distanceTo(along(B, b0, 'handlePrev'))).toBeLessThan(1e-9);
  });

  it('all pairs start opposite and coupled', () => {
    const { nodes } = joined();
    for (const node of nodes) {
      expect(node.pairs.every((p) => p.coupled)).toBe(true);
      const axis = new Vector3(node.handles.edge.x, node.handles.edge.y, node.handles.edge.z).normalize();
      const across = (slot: string) => {
        const h = new Vector3(node.handles[slot].x, node.handles[slot].y, node.handles[slot].z);
        return h.addScaledVector(axis, -h.dot(axis)).normalize();
      };
      expect(across('yellowA').dot(across('yellowB'))).toBeCloseTo(-1, 9);
      expect(across('pinkA').dot(across('pinkB'))).toBeCloseTo(-1, 9);
    }
  });

  it('editing the point in one patch changes the node; the other patch reads the change', () => {
    const { A, B, nodes, segA } = joined();
    const node = nodes[0];
    const use = node.uses.find((u) => u.entityId === 'A');
    if (!use) {throw new Error('no use');}
    const p = pt(A, segA.startPointId);
    const moved: PatchPoint = { ...p, pos: v(p.pos.x, p.pos.y + 0.2, p.pos.z), handleNext: v(p.handleNext.x, p.handleNext.y + 0.2, p.handleNext.z), handlePrev: v(p.handlePrev.x, p.handlePrev.y + 0.2, p.handlePrev.z), handleCrossIn: v(p.handleCrossIn.x, p.handleCrossIn.y + 0.2, p.handleCrossIn.z) };
    const edited = applyPointEditToNode(node, use, A.transform, moved);
    const bPoints = resolvePatchPoints((B.patchParams).points, 'B', B.transform, [edited, nodes[1]]);
    const bp = bPoints.find((q) => q.nodeId === node.id)!;
    expect(worldOf(bp.pos, B.transform).distanceTo(worldOf(moved.pos, A.transform))).toBeLessThan(1e-9);
  });

  it('coupled yellow pair: turning one yellow handle turns the other opposite, length kept', () => {
    const { A, nodes, segA } = joined();
    const node = nodes[0];
    const use = node.uses.find((u) => u.entityId === 'A');
    if (!use) {throw new Error('no use');}
    const lenB = new Vector3(node.handles.yellowB.x, node.handles.yellowB.y, node.handles.yellowB.z).length();
    const p = pt(A, segA.startPointId);
    const edited = applyPointEditToNode(node, use, A.transform, { ...p, handleCrossIn: v(p.pos.x + 0.1, p.pos.y + 0.4, p.pos.z) });
    const yb = new Vector3(edited.handles.yellowB.x, edited.handles.yellowB.y, edited.handles.yellowB.z);
    const ya = new Vector3(edited.handles.yellowA.x, edited.handles.yellowA.y, edited.handles.yellowA.z);
    const axis = new Vector3(edited.handles.edge.x, edited.handles.edge.y, edited.handles.edge.z).normalize();
    const across = (h: Vector3) => h.clone().addScaledVector(axis, -h.dot(axis));
    expect(across(ya).normalize().dot(across(yb).normalize())).toBeCloseTo(-1, 9);
    expect(across(yb).length()).toBeCloseTo(across(new Vector3(node.handles.yellowB.x, node.handles.yellowB.y, node.handles.yellowB.z)).length(), 9);
    expect(yb.length()).toBeGreaterThan(0);
    expect(lenB).toBeGreaterThan(0);
  });

  it('Shift (joint = corner) frees the yellow pair; align opposite couples it again', () => {
    const { A, nodes, segA } = joined();
    const node = nodes[0];
    const use = node.uses.find((u) => u.entityId === 'A');
    if (!use) {throw new Error('no use');}
    const p = pt(A, segA.startPointId);
    const freed = applyPointEditToNode(node, use, A.transform, { ...p, joint: 'corner', handleCrossIn: v(p.pos.x, p.pos.y + 0.5, p.pos.z + 0.3) });
    expect(freed.pairs.find((q) => q.a === 'yellowA')?.coupled).toBe(false);
    expect(freed.handles.yellowB).toEqual(node.handles.yellowB); // partner did not turn
    const aligned = alignNodeOpposite(freed);
    expect(aligned.pairs.every((q) => q.coupled)).toBe(true);
  });

  it('moving a patch moves its nodes rigidly (shared edge goes along)', () => {
    const { nodes } = joined();
    const before: EntityTransform = { position: v(0, 0, 0), rotation: v(0, 0, 0) };
    const after: EntityTransform = { position: v(1, 0, 0), rotation: v(0, Math.PI / 2, 0) };
    const moved = moveNodeWithPatch(nodes[0], before, after);
    const expected = worldOf(nodes[0].pos, after);
    expect(new Vector3(moved.pos.x, moved.pos.y, moved.pos.z).distanceTo(expected)).toBeLessThan(1e-9);
  });

  it('a node with only one user left dissolves', () => {
    const node: PatchNode = joined().nodes[0];
    expect(removeNodeUse(node, 'B')).toBeNull();
  });

  it('refuses to join points that already are nodes', () => {
    const { A, B, segA, segB } = joined();
    const again = joinSharedEdge({ entity: A, segment: segA }, { entity: B, segment: segB }, () => 'x');
    expect(again).toBeNull();
  });

  describe('reconcile (engine sync)', () => {
    const apply = (entities: AssetEntity[], points: Map<string, PatchPoint[]>) =>
      entities.map((e) => (points.has(e.id) ? { ...e, patchParams: { ...(e.patchParams!), points: points.get(e.id)! } } : e));

    it('an edit in one patch reaches the node and the other patch; a second run changes nothing', () => {
      const { A, B, nodes, segA, segB } = joined();
      const prev = new Map([[A.id, A], [B.id, B]]);
      const p = pt(A, segA.startPointId);
      const lift = (q: Vec3) => v(q.x, q.y + 0.3, q.z);
      const editedPoint = { ...p, pos: lift(p.pos), handleNext: lift(p.handleNext), handlePrev: lift(p.handlePrev), handleCrossIn: lift(p.handleCrossIn) };
      const A2 = { ...A, patchParams: { ...(A.patchParams), points: (A.patchParams).points.map((q) => (q.id === p.id ? editedPoint : q)) } };
      const r1 = reconcilePatchNodes(prev, [A2, B], nodes);
      expect(r1.nodes).not.toBeNull();
      const [, B3] = apply([A2, B], r1.points);
      const bp = pt(B3, segB.endPointId);
      expect(worldOf(bp.pos, B.transform).distanceTo(worldOf(editedPoint.pos, A.transform))).toBeLessThan(1e-9);
      const r2 = reconcilePatchNodes(new Map([[A2.id, A2], [B3.id, B3]]), [A2, B3], r1.nodes ?? nodes);
      expect(r2.nodes).toBeNull();
      expect(r2.points.size).toBe(0);
    });

    it('moving a patch takes its nodes along; the other patch follows', () => {
      const { A, B, nodes, segA, segB } = joined();
      const prev = new Map([[A.id, A], [B.id, B]]);
      const A2 = { ...A, transform: { position: v(0, 0.5, 0), rotation: v(0, 0, 0) } };
      const r = reconcilePatchNodes(prev, [A2, B], nodes);
      const [, B3] = apply([A2, B], r.points);
      const a0 = pt(A2, segA.startPointId);
      const b0 = pt(B3, segB.endPointId);
      expect(worldOf(b0.pos, B.transform).distanceTo(worldOf(a0.pos, A2.transform))).toBeLessThan(1e-9);
    });

    it('deleting one patch dissolves its nodes into normal points of the other', () => {
      const { A, B, nodes, segA } = joined();
      const prev = new Map([[A.id, A], [B.id, B]]);
      const r = reconcilePatchNodes(prev, [A], nodes);
      expect(r.nodes).toEqual([]);
      const [A3] = apply([A], r.points);
      expect(pt(A3, segA.startPointId).nodeId).toBeUndefined();
    });
  });

  describe('editing a shared point directly', () => {
    it('lists the handles a patch does not own (other yellow, other neighboring-edge pink)', () => {
      const { nodes } = joined();
      const node = nodes[0];
      const useA = node.uses.find((u) => u.entityId === 'A');
      if (!useA) {throw new Error('no use');}
      expect(extraSlotsFor(node, useA)).toEqual({ yellow: 'yellowB', pink: 'pinkB' });
    });

    it('setting an extra handle turns its coupled partner; free uncouples', () => {
      const { nodes } = joined();
      const node = nodes[0];
      const moved = setNodeSlot(node, 'yellowB', v(0, 0.4, 0.4));
      expect(moved.handles.yellowA).not.toEqual(node.handles.yellowA);
      const freed = setNodeSlot(node, 'yellowB', v(0, 0.4, 0.4), true);
      expect(freed.handles.yellowA).toEqual(node.handles.yellowA);
      expect(freed.pairs.find((q) => q.a === 'yellowA')?.coupled).toBe(false);
    });

    it('names shared points uniquely', () => {
      const { nodes } = joined();
      const named = nodes.map((n, i) => ({ ...n, name: `Shared ${String(i + 1)}` }));
      expect(nextSharedNodeName(named)).toBe('Shared 3');
      expect(nextSharedNodeName([], ['Shared 1'])).toBe('Shared 2');
    });
  });
});
