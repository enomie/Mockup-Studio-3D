import { Euler, Quaternion, Vector3 } from 'three';
import type { PatchParams, PatchPoint } from './asset-triangle-patch';
import type { AssetEntity, EntityTransform, Vec3 } from './entity-types';
import { segmentHandleKeys, type PatchEdgeLink, type PatchSegment } from './triangle-patch-edge-link';

/**
 * Shared patch points ("nodes"): one point stored once in the scene and used by several
 * patches. Joining two edges turns 4 points into 2 nodes. A patch point that uses a node
 * only refers to it (PatchPoint.nodeId); the node holds position, name and every handle once.
 *
 * Nodes live in world space. Each user (patch point) maps its three handles (next, prev,
 * cross) onto handle slots of the node. Handles that face each other form pairs:
 * - 'across': opposite across the shared edge (yellow <-> yellow, neighboring-edge pinks),
 * - 'line': exactly opposite (forward <-> backward pink inside a shared edge).
 * Coupled pairs stay opposite when one handle moves (lengths free); Shift frees a pair.
 */

export interface PatchNodeUse {
  entityId: string;
  pointId: string;
  /** Slot ids for the patch point's handleNext / handlePrev / handleCrossIn. */
  next: string;
  prev: string;
  cross: string;
}

interface PatchNodePair {
  a: string;
  b: string;
  kind: 'across' | 'line';
  coupled: boolean;
}

export interface PatchNode {
  id: string;
  name: string;
  /** World position. */
  pos: Vec3;
  /** Handle offsets from pos, world space, one per slot. */
  handles: Record<string, Vec3>;
  pairs: PatchNodePair[];
  /** Slots that run along the shared edge (define the edge axis). */
  along: string[];
  uses: PatchNodeUse[];
}

const EPS = 1e-12;

// --- Space helpers -------------------------------------------------------------------

function rotationOf(t: EntityTransform): Quaternion {
  return new Quaternion().setFromEuler(new Euler(t.rotation.x, t.rotation.y, t.rotation.z, 'XYZ'));
}

const vec = (v: Vec3) => new Vector3(v.x, v.y, v.z);
const plain = (v: Vector3): Vec3 => ({ x: v.x, y: v.y, z: v.z });

function toWorldPoint(local: Vec3, t: EntityTransform): Vector3 {
  return vec(local).applyQuaternion(rotationOf(t)).add(vec(t.position));
}

function toLocalPoint(world: Vec3, t: EntityTransform): Vec3 {
  return plain(vec(world).sub(vec(t.position)).applyQuaternion(rotationOf(t).invert()));
}

function toWorldOffset(local: Vec3, t: EntityTransform): Vec3 {
  return plain(vec(local).applyQuaternion(rotationOf(t)));
}

/** A patch-local point in scene (world) coordinates; used by the inspector fields. */
export function patchLocalToWorld(local: Vec3, t: EntityTransform): Vec3 {
  return plain(toWorldPoint(local, t));
}

/** A scene (world) point in the local space of a patch; inverse of patchLocalToWorld. */
export function patchWorldToLocal(world: Vec3, t: EntityTransform): Vec3 {
  return toLocalPoint(world, t);
}

function toLocalOffset(world: Vec3, t: EntityTransform): Vec3 {
  return plain(vec(world).applyQuaternion(rotationOf(t).invert()));
}

function offsetOf(point: PatchPoint, key: 'handleNext' | 'handlePrev' | 'handleCrossIn'): Vec3 {
  return { x: point[key].x - point.pos.x, y: point[key].y - point.pos.y, z: point[key].z - point.pos.z };
}

function avg(a: Vec3, b: Vec3): Vec3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

function differs(a: Vec3, b: Vec3): boolean {
  return Math.abs(a.x - b.x) > 1e-9 || Math.abs(a.y - b.y) > 1e-9 || Math.abs(a.z - b.z) > 1e-9;
}

/** Unit edge axis of a node (from its along slots), or null. */
function edgeAxis(node: PatchNode): Vector3 | null {
  for (const slot of node.along) {
    const h = node.handles[slot];
    const v = vec(h);
    if (v.lengthSq() > EPS) {return v.normalize();}
  }
  return null;
}

// --- Average opposite ------------------------------------------------------------------

/**
 * Two vectors put opposite on their average direction (only the part across `axis` when
 * given; the parts along it stay). Lengths are kept. Symmetric in a and b.
 */
export function averageOpposite(a: Vector3, b: Vector3, axis?: Vector3): [Vector3, Vector3] {
  const unitAxis = axis && axis.lengthSq() > 1e-20 ? axis.clone().normalize() : null;
  const alongA = unitAxis ? a.dot(unitAxis) : 0;
  const alongB = unitAxis ? b.dot(unitAxis) : 0;
  const perpA = unitAxis ? a.clone().addScaledVector(unitAxis, -alongA) : a.clone();
  const perpB = unitAxis ? b.clone().addScaledVector(unitAxis, -alongB) : b.clone();
  const la = perpA.length();
  const lb = perpB.length();
  if (la < 1e-12 && lb < 1e-12) {return [a.clone(), b.clone()];}
  const dir = new Vector3();
  if (la > 1e-12) {dir.addScaledVector(perpA, 1 / la);}
  if (lb > 1e-12) {dir.addScaledVector(perpB, -1 / lb);}
  if (dir.lengthSq() < 1e-20) {dir.copy(perpA).normalize();} // a and b point the same way
  dir.normalize();
  const outA = dir.clone().multiplyScalar(la);
  const outB = dir.clone().multiplyScalar(-lb);
  if (unitAxis) {
    outA.addScaledVector(unitAxis, alongA);
    outB.addScaledVector(unitAxis, alongB);
  }
  return [outA, outB];
}

// --- Creating nodes ------------------------------------------------------------------

/** One side of a join: a patch point with its patch transform. */
export interface NodeSide {
  entityId: string;
  transform: EntityTransform;
  point: PatchPoint;
}

/**
 * Joins two end points of a shared segment into one node (average position and handles,
 * every pair opposite and coupled). `intoA` / `intoB`: the handle of each point that runs
 * into the shared segment.
 */
function createEndNode(
  id: string,
  a: NodeSide,
  intoA: 'handleNext' | 'handlePrev',
  b: NodeSide,
  intoB: 'handleNext' | 'handlePrev',
): PatchNode {
  const offA = intoA === 'handleNext' ? 'handlePrev' : 'handleNext';
  const offB = intoB === 'handleNext' ? 'handlePrev' : 'handleNext';
  const pos = avg(plain(toWorldPoint(a.point.pos, a.transform)), plain(toWorldPoint(b.point.pos, b.transform)));
  const edge = avg(toWorldOffset(offsetOf(a.point, intoA), a.transform), toWorldOffset(offsetOf(b.point, intoB), b.transform));
  const axis = vec(edge);
  const [pinkA, pinkB] = averageOpposite(
    vec(toWorldOffset(offsetOf(a.point, offA), a.transform)),
    vec(toWorldOffset(offsetOf(b.point, offB), b.transform)),
    axis,
  );
  const [yellowA, yellowB] = averageOpposite(
    vec(toWorldOffset(offsetOf(a.point, 'handleCrossIn'), a.transform)),
    vec(toWorldOffset(offsetOf(b.point, 'handleCrossIn'), b.transform)),
    axis,
  );
  const makeUse = (side: NodeSide, into: string, off: string, cross: string, isNext: boolean): PatchNodeUse => ({
    entityId: side.entityId,
    pointId: side.point.id,
    next: isNext ? into : off,
    prev: isNext ? off : into,
    cross,
  });
  return {
    id,
    name: a.point.name,
    pos,
    handles: { edge, pinkA: plain(pinkA), pinkB: plain(pinkB), yellowA: plain(yellowA), yellowB: plain(yellowB) },
    pairs: [
      { a: 'pinkA', b: 'pinkB', kind: 'across', coupled: true },
      { a: 'yellowA', b: 'yellowB', kind: 'across', coupled: true },
    ],
    along: ['edge'],
    uses: [
      makeUse(a, 'edge', 'pinkA', 'yellowA', intoA === 'handleNext'),
      makeUse(b, 'edge', 'pinkB', 'yellowB', intoB === 'handleNext'),
    ],
  };
}

/**
 * Joins two inner points of a shared edge (e.g. a point inserted on it). `sameDirection`:
 * B runs the edge the same way as A (B's next = A's next), otherwise reversed.
 */
export function createInnerNode(id: string, a: NodeSide, b: NodeSide, sameDirection: boolean): PatchNode {
  const pos = avg(plain(toWorldPoint(a.point.pos, a.transform)), plain(toWorldPoint(b.point.pos, b.transform)));
  const bFwdKey = sameDirection ? 'handleNext' : 'handlePrev';
  const bBwdKey = sameDirection ? 'handlePrev' : 'handleNext';
  const fwd = avg(toWorldOffset(offsetOf(a.point, 'handleNext'), a.transform), toWorldOffset(offsetOf(b.point, bFwdKey), b.transform));
  const bwd = avg(toWorldOffset(offsetOf(a.point, 'handlePrev'), a.transform), toWorldOffset(offsetOf(b.point, bBwdKey), b.transform));
  const [f, w] = averageOpposite(vec(fwd), vec(bwd));
  const [yellowA, yellowB] = averageOpposite(
    vec(toWorldOffset(offsetOf(a.point, 'handleCrossIn'), a.transform)),
    vec(toWorldOffset(offsetOf(b.point, 'handleCrossIn'), b.transform)),
    f,
  );
  return {
    id,
    name: a.point.name,
    pos,
    handles: { fwd: plain(f), bwd: plain(w), yellowA: plain(yellowA), yellowB: plain(yellowB) },
    pairs: [
      { a: 'fwd', b: 'bwd', kind: 'line', coupled: true },
      { a: 'yellowA', b: 'yellowB', kind: 'across', coupled: true },
    ],
    along: ['fwd', 'bwd'],
    uses: [
      { entityId: a.entityId, pointId: a.point.id, next: 'fwd', prev: 'bwd', cross: 'yellowA' },
      {
        entityId: b.entityId,
        pointId: b.point.id,
        next: sameDirection ? 'fwd' : 'bwd',
        prev: sameDirection ? 'bwd' : 'fwd',
        cross: 'yellowB',
      },
    ],
  };
}

// --- Reading -------------------------------------------------------------------------

function pairWith(node: PatchNode, slot: string): PatchNodePair | undefined {
  return node.pairs.find((p) => p.a === slot || p.b === slot);
}

/** The pink pair of a use: line pair inside an edge, or the pair of its off-edge pink. */
function pinkPairOf(node: PatchNode, use: PatchNodeUse): PatchNodePair | undefined {
  return pairWith(node, node.along.includes(use.next) ? use.prev : use.next) ?? pairWith(node, use.next);
}

/** The patch point a use sees: the node read into the patch's local space. */
function resolveNodePoint(node: PatchNode, use: PatchNodeUse, transform: EntityTransform, base: PatchPoint): PatchPoint {
  const pos = toLocalPoint(node.pos, transform);
  const handle = (slot: string): Vec3 => {
    const o = toLocalOffset(node.handles[slot] ?? { x: 0, y: 0, z: 0 }, transform);
    return { x: pos.x + o.x, y: pos.y + o.y, z: pos.z + o.z };
  };
  return {
    ...base,
    name: node.name,
    nodeId: node.id,
    pos,
    handleNext: handle(use.next),
    handlePrev: handle(use.prev),
    handleCrossIn: handle(use.cross),
    handleCrossOut: { ...pos },
    joint: pairWith(node, use.cross)?.coupled ? 'smooth' : 'corner',
    pinkPair: pinkPairOf(node, use)?.coupled ? 'coupled' : 'free',
  };
}

// --- Editing -------------------------------------------------------------------------

/** Turns `slot`'s partner so the pair is opposite again (lengths and along-parts kept). */
function realignPartner(node: PatchNode, pair: PatchNodePair, movedSlot: string): Record<string, Vec3> {
  const other = pair.a === movedSlot ? pair.b : pair.a;
  const moved = vec(node.handles[movedSlot]);
  const partner = vec(node.handles[other]);
  if (moved.lengthSq() < EPS) {return node.handles;}
  let next: Vector3;
  if (pair.kind === 'line') {
    next = moved.clone().normalize().multiplyScalar(-partner.length());
  } else {
    const axis = edgeAxis(node);
    if (!axis) {return node.handles;}
    const perpMoved = moved.clone().addScaledVector(axis, -moved.dot(axis));
    if (perpMoved.lengthSq() < EPS) {return node.handles;}
    const alongP = partner.dot(axis);
    const perpLen = partner.clone().addScaledVector(axis, -alongP).length();
    next = axis.clone().multiplyScalar(alongP).addScaledVector(perpMoved.normalize(), -perpLen);
  }
  return { ...node.handles, [other]: plain(next) };
}

/**
 * A patch edited its view of the node (`edited`, patch-local). Writes position, name and
 * the changed handles into the node; coupled pairs turn along. The point's joint /
 * pinkPair = 'corner' / 'free' frees the respective pair (Shift).
 */
export function applyPointEditToNode(node: PatchNode, use: PatchNodeUse, transform: EntityTransform, edited: PatchPoint): PatchNode {
  let next: PatchNode = { ...node, name: edited.name, pos: plain(toWorldPoint(edited.pos, transform)) };
  const changed: string[] = [];
  const slots: [string, 'handleNext' | 'handlePrev' | 'handleCrossIn'][] = [
    [use.next, 'handleNext'],
    [use.prev, 'handlePrev'],
    [use.cross, 'handleCrossIn'],
  ];
  const handles = { ...next.handles };
  for (const [slot, key] of slots) {
    const world = toWorldOffset(offsetOf(edited, key), transform);
    if (differs(world, handles[slot])) {
      handles[slot] = world;
      changed.push(slot);
    }
  }
  next = { ...next, handles };

  // Freed pairs (Shift): the point reports them through its joint / pinkPair flags.
  const yellow = pairWith(next, use.cross);
  const pink = pinkPairOf(next, use);
  next = {
    ...next,
    pairs: next.pairs.map((p) => {
      if (p === yellow && edited.joint === 'corner' && p.coupled) {return { ...p, coupled: false };}
      if (p === pink && edited.pinkPair === 'free' && p.coupled) {return { ...p, coupled: false };}
      return p;
    }),
  };

  // Coupled pairs where exactly one handle moved: the other turns along.
  for (const pair of next.pairs) {
    if (!pair.coupled) {continue;}
    const movedA = changed.includes(pair.a);
    const movedB = changed.includes(pair.b);
    if (movedA === movedB) {continue;}
    next = { ...next, handles: realignPartner(next, pair, movedA ? pair.a : pair.b) };
  }
  return next;
}

/** "Align handles opposite": every pair opposite on its average direction, coupled. */
export function alignNodeOpposite(node: PatchNode): PatchNode {
  let handles = { ...node.handles };
  const axis = edgeAxis(node) ?? undefined;
  for (const pair of node.pairs) {
    const [a, b] = averageOpposite(vec(handles[pair.a]), vec(handles[pair.b]), pair.kind === 'across' ? axis : undefined);
    handles = { ...handles, [pair.a]: plain(a), [pair.b]: plain(b) };
  }
  return { ...node, handles, pairs: node.pairs.map((p) => ({ ...p, coupled: true })) };
}

/** A patch moved/turned (from `before` to `after`): its nodes move along rigidly. */
export function moveNodeWithPatch(node: PatchNode, before: EntityTransform, after: EntityTransform): PatchNode {
  const turn = rotationOf(after).multiply(rotationOf(before).invert());
  const pos = toWorldPoint(toLocalPoint(node.pos, before), after);
  const handles: Record<string, Vec3> = {};
  for (const [slot, h] of Object.entries(node.handles)) {handles[slot] = plain(vec(h).applyQuaternion(turn));}
  return { ...node, pos: plain(pos), handles };
}

/** Removes a patch from a node; null when fewer than two users remain (node dissolves). */
export function removeNodeUse(node: PatchNode, entityId: string): PatchNode | null {
  const uses = node.uses.filter((u) => u.entityId !== entityId);
  return uses.length >= 2 ? { ...node, uses } : null;
}

// --- Joining two edges ---------------------------------------------------------------

/** A patch side of an edge to join: entity plus segment (start pairs with the other start). */
export interface JoinSide {
  entity: AssetEntity;
  segment: PatchSegment;
}

/**
 * Joins two edge segments: their 4 end points become 2 nodes used by both patches.
 * Returns the nodes and both patches' new params (points now views of the nodes; the
 * shared segment is also recorded in edgeLinks for the surface code). Null when a point
 * is already a node or the segments are not valid.
 */
export function joinSharedEdge(
  a: JoinSide,
  b: JoinSide,
  newNodeId: () => string,
  newNodeName: () => string = () => '',
): { nodes: PatchNode[]; aParams: PatchParams; bParams: PatchParams } | null {
  const pa = a.entity.patchParams;
  const pb = b.entity.patchParams;
  if (!pa || !pb || a.entity.id === b.entity.id) {return null;}
  const find = (params: PatchParams, id: string) => params.points.find((p) => p.id === id);
  const ends: [string, string, string, string][] = [
    [a.segment.startPointId, a.segment.endPointId, b.segment.startPointId, b.segment.endPointId],
    [a.segment.endPointId, a.segment.startPointId, b.segment.endPointId, b.segment.startPointId],
  ];
  const nodes: PatchNode[] = [];
  for (const [aId, aOther, bId, bOther] of ends) {
    const ap = find(pa, aId);
    const bp = find(pb, bId);
    const ka = segmentHandleKeys(pa, aId, aOther);
    const kb = segmentHandleKeys(pb, bId, bOther);
    if (!ap || !bp || !ka || !kb || ap.nodeId || bp.nodeId) {return null;}
    const node = createEndNode(
      newNodeId(),
      { entityId: a.entity.id, transform: a.entity.transform, point: ap },
      ka.a,
      { entityId: b.entity.id, transform: b.entity.transform, point: bp },
      kb.a,
    );
    const name = newNodeName();
    nodes.push(name ? { ...node, name } : node);
  }
  const link = (from: JoinSide, to: JoinSide): PatchEdgeLink => ({
    startPointId: from.segment.startPointId,
    endPointId: from.segment.endPointId,
    partnerEntityId: to.entity.id,
    partnerStartPointId: to.segment.startPointId,
    partnerEndPointId: to.segment.endPointId,
  });
  const resolveSide = (side: JoinSide, params: PatchParams, other: JoinSide): PatchParams => ({
    ...params,
    points: resolvePatchPoints(params.points, side.entity.id, side.entity.transform, nodes),
    edgeLinks: [...(params.edgeLinks ?? []), link(side, other)],
  });
  return { nodes, aParams: resolveSide(a, pa, b), bParams: resolveSide(b, pb, a) };
}

/** Points of a patch with every node-backed point read from its node. */
export function resolvePatchPoints(
  points: readonly PatchPoint[],
  entityId: string,
  transform: EntityTransform,
  nodes: readonly PatchNode[],
): PatchPoint[] {
  return points.map((point) => {
    const node = nodes.find((n) => n.uses.some((u) => u.entityId === entityId && u.pointId === point.id));
    const use = node?.uses.find((u) => u.entityId === entityId && u.pointId === point.id);
    return node && use ? resolveNodePoint(node, use, transform, point) : point;
  });
}

// --- Keeping nodes and patches in line ---------------------------------------------------

function pointDiffers(a: PatchPoint, b: PatchPoint): boolean {
  return (
    a.name !== b.name ||
    a.joint !== b.joint ||
    a.pinkPair !== b.pinkPair ||
    differs(a.pos, b.pos) ||
    differs(a.handleNext, b.handleNext) ||
    differs(a.handlePrev, b.handlePrev) ||
    differs(a.handleCrossIn, b.handleCrossIn)
  );
}

function sameTransform(a: EntityTransform, b: EntityTransform): boolean {
  return !differs(a.position, b.position) && !differs(a.rotation, b.rotation);
}

/**
 * After entity changes: patches that edited a node-backed point write it into the node,
 * patches that moved take their nodes along, vanished users are dropped (a node with one
 * user left dissolves into a normal point). Then every user re-reads its nodes.
 * Returns the new node list (null: unchanged) and the new points per patch to write.
 */
export function reconcilePatchNodes(
  previous: ReadonlyMap<string, AssetEntity>,
  entities: readonly AssetEntity[],
  nodes: readonly PatchNode[],
): { nodes: PatchNode[] | null; points: Map<string, PatchPoint[]> } {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const pointOf = (use: PatchNodeUse) => byId.get(use.entityId)?.patchParams?.points.find((p) => p.id === use.pointId);
  const changedNodes = new Set<string>();
  const dissolved: PatchNodeUse[] = [];
  const next: PatchNode[] = [];

  for (const original of nodes) {
    let node = original;
    const uses = node.uses.filter((u) => pointOf(u)?.nodeId === node.id);
    if (uses.length !== node.uses.length) {node = { ...node, uses };}
    if (uses.length < 2) {
      dissolved.push(...uses);
      changedNodes.add(node.id);
      continue;
    }
    for (const use of uses) {
      const entity = byId.get(use.entityId);
      const before = previous.get(use.entityId);
      const point = pointOf(use);
      if (!entity || !point || before === entity) {continue;}
      if (before && !sameTransform(before.transform, entity.transform)) {
        node = moveNodeWithPatch(node, before.transform, entity.transform);
      } else if (pointDiffers(point, resolveNodePoint(node, use, entity.transform, point))) {
        node = applyPointEditToNode(node, use, entity.transform, point);
      }
    }
    if (node !== original) {changedNodes.add(node.id);}
    next.push(node);
  }

  const points = new Map<string, PatchPoint[]>();
  const current = (id: string) => points.get(id) ?? byId.get(id)?.patchParams?.points;
  for (const use of dissolved) {
    const list = current(use.entityId);
    if (!list) {continue;}
    points.set(use.entityId, list.map((p) => {
      if (p.id !== use.pointId) {return p;}
      const { nodeId: _drop, ...rest } = p;
      return rest;
    }));
  }
  for (const node of next) {
    for (const use of node.uses) {
      const entity = byId.get(use.entityId);
      const list = current(use.entityId);
      const point = list?.find((p) => p.id === use.pointId);
      if (!entity || !list || !point) {continue;}
      const view = resolveNodePoint(node, use, entity.transform, point);
      if (pointDiffers(point, view)) {points.set(use.entityId, list.map((p) => (p.id === point.id ? view : p)));}
    }
  }
  return { nodes: changedNodes.size > 0 ? next : null, points };
}

// --- Editing a node directly (handles a patch does not own) ------------------------------

/**
 * Handles of the node a patch does not map itself (the other patch's yellow and, at end
 * points, its neighboring-edge pink). They are shown and edited on the same point.
 */
export function extraSlotsFor(node: PatchNode, use: PatchNodeUse): { yellow: string | null; pink: string | null } {
  const partnerOf = (slot: string) => {
    const pair = pairWith(node, slot);
    return pair ? (pair.a === slot ? pair.b : pair.a) : null;
  };
  const own = new Set([use.next, use.prev, use.cross]);
  const yellow = partnerOf(use.cross);
  const off = node.along.includes(use.next) ? use.prev : use.next;
  const pink = node.along.includes(off) ? null : partnerOf(off);
  return {
    yellow: yellow && !own.has(yellow) ? yellow : null,
    pink: pink && !own.has(pink) ? pink : null,
  };
}

/** Sets one handle of the node (world offset). Coupled pairs turn along unless `free`. */
export function setNodeSlot(node: PatchNode, slot: string, worldOffset: Vec3, free = false): PatchNode {
  let next: PatchNode = { ...node, handles: { ...node.handles, [slot]: worldOffset } };
  const pair = pairWith(next, slot);
  if (!pair) {return next;}
  if (free) {
    return { ...next, pairs: next.pairs.map((p) => (p === pair ? { ...p, coupled: false } : p)) };
  }
  if (pair.coupled) {next = { ...next, handles: realignPartner(next, pair, slot) };}
  return next;
}

/** True when any handle pair of the node was freed (not opposite any more). */
export function nodeHasFreePairs(node: PatchNode): boolean {
  return node.pairs.some((p) => !p.coupled);
}

/** World position of a node handle tip. */
export function nodeSlotWorld(node: PatchNode, slot: string): Vec3 {
  const h = node.handles[slot];
  return { x: node.pos.x + h.x, y: node.pos.y + h.y, z: node.pos.z + h.z };
}

/** A node handle tip in the local space of a patch (for the inspector fields). */
export function nodeSlotLocal(node: PatchNode, slot: string, transform: EntityTransform): Vec3 {
  return toLocalPoint(nodeSlotWorld(node, slot), transform);
}

/** World offset of a node handle whose tip is given in a patch's local space. */
export function nodeOffsetFromLocalTip(node: PatchNode, localTip: Vec3, transform: EntityTransform): Vec3 {
  const w = toWorldPoint(localTip, transform);
  return { x: w.x - node.pos.x, y: w.y - node.pos.y, z: w.z - node.pos.z };
}

/** Next free "Shared N" name (one name per shared point, unique in the scene). */
export function nextSharedNodeName(nodes: readonly PatchNode[], taken: readonly string[] = []): string {
  const used = new Set([...nodes.map((n) => n.name), ...taken]);
  let i = 1;
  while (used.has(`Shared ${i}`)) {i++;}
  return `Shared ${i}`;
}

/**
 * Which pair a patch's own handle of a shared point belongs to (for Shift + drag): the
 * yellow pair, the pink pair, or none (the pink running along the shared edge).
 */
export function pairOfOwnHandle(node: PatchNode, use: PatchNodeUse, key: string): 'yellow' | 'pink' | null {
  const slot = key === 'handleNext' ? use.next : key === 'handlePrev' ? use.prev : key === 'handleCrossIn' ? use.cross : null;
  if (!slot || !pairWith(node, slot)) {return null;}
  return slot === use.cross ? 'yellow' : 'pink';
}
