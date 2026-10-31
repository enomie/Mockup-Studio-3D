import type { Vec3 } from '@/scene/entity-types';
import {
  BufferGeometry,
  Group,
  Line,
  LineBasicNodeMaterial,
  Mesh,
  MeshBasicNodeMaterial,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Object3D,
  type Ray,
  type Sphere,
  type Scene,
} from 'three/webgpu';
import {
  findPatchPoint,
  isPatchCorner,
  replacePatchPoint,
  type PatchHandleSelection,
  type PatchHandleTarget,
  type PatchPoint,
  type PatchParams,
  isPatchAssetKind,
} from '@/scene/asset-triangle-patch';
import type { EntityRegistry } from './entity-registry';
import {
  extraSlotsFor,
  nodeSlotWorld,
  pairOfOwnHandle,
  setNodeSlot,
  type PatchNode,
  type PatchNodeUse,
} from '@/scene/patch-nodes';

export const PATCH_GIZMO_HANDLE_ROLE = 'patchGizmoHandle';

/** Shortest handle length the ring drag allows (entity-local meters). */
const MIN_HANDLE_LENGTH_M = 0.002;
const RING_AXIS = new Vector3(0, 0, 1);

/** Own handles with a length ring; the extra handles of a shared point have none. */
type LeverKey = Exclude<PatchHandleTarget, 'pos' | 'handleCrossOut' | 'sharedPink'>;

interface LengthDragState {
  pointId: string;
  key: LeverKey;
  /** Entity-local unit direction, frozen for the whole drag. */
  dir: Vector3;
  startLength: number;
  startAxisParam: number;
}

/**
 * Param `t` of the point on the line `origin + dir * t` closest to `ray`
 * (`dir` normalized). Returns null when ray and line are parallel.
 */
export function closestAxisParamToRay(origin: Vector3, dir: Vector3, ray: Ray): number | null {
  const w = origin.clone().sub(ray.origin);
  const b = dir.dot(ray.direction);
  const denom = 1 - b * b;
  if (denom < 1e-6) {return null;}
  const d = dir.dot(w);
  const e = ray.direction.dot(w);
  return (b * e - d) / denom;
}

export type PatchSubTarget = PatchHandleSelection;

/** Shift state for Shift+drag (break a smooth joint); tracked globally, the gizmo has no event. */
let shiftHeld = false;
if (typeof window !== 'undefined') {
  const track = (event: KeyboardEvent) => { shiftHeld = event.shiftKey; };
  window.addEventListener('keydown', track, { capture: true });
  window.addEventListener('keyup', track, { capture: true });
  window.addEventListener('pointerdown', (event) => { shiftHeld = event.shiftKey; }, { capture: true });
  window.addEventListener('blur', () => { shiftHeld = false; });
}

function isShiftHeld(): boolean {
  return shiftHeld;
}

interface PointHelpers {
  anchor: Mesh;
  /** Ring around the anchor of a smooth joint (faces the camera). */
  jointRing: Mesh;
  handleNext: Mesh;
  handlePrev: Mesh;
  handleCrossIn: Mesh;
  /** Shared point: the node's other yellow handle (hidden on normal points). */
  handleCrossOut: Mesh;
  /** Shared end point: the node's other neighboring-edge pink handle. */
  sharedPink: Mesh;
  lineSharedPink: Line;
  lineNext: Line;
  linePrev: Line;
  lineCross: Line;
}

/** Geometries and materials shared by every point's helper meshes. */
interface HelperResources {
  anchorGeo: SphereGeometry;
  anchorMat: MeshBasicNodeMaterial;
  /** The partner patch's yellow handle shown as this point's counterpart. */
  jointRingGeo: TorusGeometry;
  jointRingMat: MeshBasicNodeMaterial;
  edgeAnchorGeo: SphereGeometry;
  edgeAnchorMat: MeshBasicNodeMaterial;
  handleGeo: OctahedronGeometry;
  pinkMat: MeshBasicNodeMaterial;
  yellowMat: MeshBasicNodeMaterial;
  linePinkMat: LineBasicNodeMaterial;
  lineYellowMat: LineBasicNodeMaterial;
}

function overlayMeshMaterial(color: number): MeshBasicNodeMaterial {
  return new MeshBasicNodeMaterial({
    color,
    transparent: true,
    opacity: 1.0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

function overlayLineMaterial(color: number): LineBasicNodeMaterial {
  return new LineBasicNodeMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

function createHelperResources(): HelperResources {
  return {
    anchorGeo: new SphereGeometry(0.025, 16, 16),
    anchorMat: overlayMeshMaterial(0x0284c7),
    jointRingGeo: new TorusGeometry(0.038, 0.005, 8, 40),
    jointRingMat: overlayMeshMaterial(0x22c55e),
    // Edge points: purple and a bit smaller than the corners
    edgeAnchorGeo: new SphereGeometry(0.021, 16, 16),
    edgeAnchorMat: overlayMeshMaterial(0xa855f7),
    handleGeo: new OctahedronGeometry(0.018),
    pinkMat: overlayMeshMaterial(0xec4899),
    yellowMat: overlayMeshMaterial(0xeab308),
    linePinkMat: overlayLineMaterial(0xec4899),
    lineYellowMat: overlayLineMaterial(0xeab308),
  };
}

export class TrianglePatchGizmoController {
  private readonly scene: Scene;
  private readonly registry: EntityRegistry;
  private activeEntityId: string | null = null;
  private activeTarget: PatchSubTarget | null = null;

  // Root group for all visual helper nodes in the scene
  private readonly helperGroup: Group;

  // Track created handle meshes for raycasting & picking
  private readonly handleMeshes: Mesh[] = [];

  // Helper meshes per patch point id, created and removed as points come and go
  private readonly pointHelpers = new Map<string, PointHelpers>();
  private readonly helperResources: HelperResources;

  /** Glowing ring on the active lever line: drag it to change only the lever length. */
  private readonly lengthRing: Mesh;
  private lengthDrag: LengthDragState | null = null;

  private onPatchChange?: (entityId: string, params: PatchParams) => void;

  constructor(scene: Scene, registry: EntityRegistry) {
    this.scene = scene;
    this.registry = registry;
    this.helperGroup = new Group();
    this.helperGroup.name = 'PatchGizmoHelperGroup';
    this.scene.add(this.helperGroup);
    this.helperGroup.visible = false;

    this.helperResources = createHelperResources();
    this.lengthRing = this.createLengthRing();
  }

  setPatchChangeListener(listener: (entityId: string, params: PatchParams) => void): void {
    this.onPatchChange = listener;
  }

  private createPointHelpers(pointId: string, isCorner: boolean): PointHelpers {
    const { anchorGeo, anchorMat, edgeAnchorGeo, edgeAnchorMat, handleGeo, pinkMat, yellowMat, linePinkMat, lineYellowMat } =
      this.helperResources;
    const handleMesh = (geometry: BufferGeometry, material: MeshBasicNodeMaterial, targetKey: PatchHandleTarget) => {
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = false;
      mesh.renderOrder = 999;
      mesh.frustumCulled = false;
      mesh.userData = { role: PATCH_GIZMO_HANDLE_ROLE, pointId, targetKey };
      return mesh;
    };
    const line = (pointCount: number, material: LineBasicNodeMaterial) => {
      const points = Array.from({ length: pointCount }, () => new Vector3());
      const mesh = new Line(new BufferGeometry().setFromPoints(points), material);
      mesh.renderOrder = 998;
      mesh.frustumCulled = false;
      return mesh;
    };

    const jointRing = new Mesh(this.helperResources.jointRingGeo, this.helperResources.jointRingMat);
    jointRing.renderOrder = 999;
    jointRing.frustumCulled = false;
    jointRing.visible = false;
    jointRing.onBeforeRender = (_renderer, _scene, camera) => { jointRing.quaternion.copy(camera.quaternion); };
    const helpers: PointHelpers = {
      jointRing,
      anchor: isCorner
        ? handleMesh(anchorGeo, anchorMat, 'pos')
        : handleMesh(edgeAnchorGeo, edgeAnchorMat, 'pos'),
      handleNext: handleMesh(handleGeo, pinkMat, 'handleNext'),
      handlePrev: handleMesh(handleGeo, pinkMat, 'handlePrev'),
      handleCrossIn: handleMesh(handleGeo, yellowMat, 'handleCrossIn'),
      handleCrossOut: handleMesh(handleGeo, yellowMat, 'handleCrossOut'),
      lineNext: line(2, linePinkMat),
      linePrev: line(2, linePinkMat),
      lineCross: line(3, lineYellowMat),
      sharedPink: handleMesh(handleGeo, pinkMat, 'sharedPink'),
      lineSharedPink: line(2, linePinkMat),
    };
    this.helperGroup.add(
      helpers.jointRing,
      helpers.anchor,
      helpers.handleNext,
      helpers.handlePrev,
      helpers.handleCrossIn,
      helpers.handleCrossOut,
      helpers.lineNext,
      helpers.linePrev,
      helpers.lineCross,
      helpers.sharedPink,
      helpers.lineSharedPink,
    );
    return helpers;
  }

  private disposePointHelpers(helpers: PointHelpers): void {
    this.helperGroup.remove(
      helpers.jointRing,
      helpers.anchor,
      helpers.handleNext,
      helpers.handlePrev,
      helpers.handleCrossIn,
      helpers.handleCrossOut,
      helpers.lineNext,
      helpers.linePrev,
      helpers.lineCross,
      helpers.sharedPink,
      helpers.lineSharedPink,
    );
    helpers.lineSharedPink.geometry.dispose();
    helpers.lineNext.geometry.dispose();
    helpers.linePrev.geometry.dispose();
    helpers.lineCross.geometry.dispose();
  }

  /** Keeps exactly one helper set per patch point. */
  private ensurePointHelpers(params: PatchParams): void {
    const { points } = params;
    const ids = new Set(points.map((point) => point.id));
    for (const [id, helpers] of this.pointHelpers) {
      if (!ids.has(id)) {
        this.disposePointHelpers(helpers);
        this.pointHelpers.delete(id);
      }
    }
    for (const point of points) {
      if (!this.pointHelpers.has(point.id)) {
        this.pointHelpers.set(point.id, this.createPointHelpers(point.id, isPatchCorner(params, point.id)));
      }
    }
    this.handleMeshes.length = 0;
    for (const point of points) {
      const h = this.pointHelpers.get(point.id);
      if (h) {this.handleMeshes.push(h.anchor, h.handleNext, h.handlePrev, h.handleCrossIn, h.handleCrossOut, h.sharedPink);}
    }
  }

  private createLengthRing(): Mesh {
    const ring = new Mesh(
      new TorusGeometry(0.024, 0.006, 12, 40),
      new MeshBasicNodeMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    ring.renderOrder = 1000;
    ring.frustumCulled = false;
    ring.visible = false;
    this.helperGroup.add(ring);
    return ring;
  }

  private activeLeverKey(): LeverKey | null {
    const key = this.activeTarget?.targetKey;
    // The cross-out counterpart belongs to the partner patch: no length ring here.
    return key && key !== 'pos' && key !== 'handleCrossOut' && key !== 'sharedPink' ? key : null;
  }

  private syncLengthRing(): void {
    const key = this.activeLeverKey();
    const corner = this.activeTarget ? this.pointHelpers.get(this.activeTarget.pointId) : undefined;
    if (!key || !corner) {
      this.lengthRing.visible = false;
      return;
    }
    const anchor = corner.anchor.position;
    const tip = corner[key].position;
    const dir = tip.clone().sub(anchor);
    if (dir.lengthSq() < 1e-12) {
      this.lengthRing.visible = false;
      return;
    }
    this.lengthRing.position.copy(anchor).lerp(tip, 0.5);
    this.lengthRing.quaternion.copy(new Quaternion().setFromUnitVectors(RING_AXIS, dir.normalize()));
    this.lengthRing.visible = true;
  }

  /** Starts a length-only drag when `ray` (world space) hits the ring. */
  beginLengthDrag(ray: Ray): boolean {
    const key = this.activeLeverKey();
    if (!key || !this.activeTarget || !this.lengthRing.visible || !this.helperGroup.visible) {
      return false;
    }
    this.lengthRing.updateMatrixWorld(true);
    if (!ray.intersectsSphere(this.lengthRingBoundingSphere())) {return false;}

    const runtime = this.activeEntityId ? this.registry.getRuntime(this.activeEntityId) : undefined;
    const params = runtime?.entity.patchParams;
    const node = params ? findPatchPoint(params, this.activeTarget.pointId) : undefined;
    if (!runtime || !node) {return false;}

    const origin = new Vector3(node.pos.x, node.pos.y, node.pos.z);
    const offset = new Vector3(node[key].x, node[key].y, node[key].z).sub(origin);
    const startLength = offset.length();
    if (startLength < 1e-9) {return false;}
    const dir = offset.divideScalar(startLength);

    const startAxisParam = closestAxisParamToRay(origin, dir, this.toEntityLocalRay(ray, runtime.object));
    if (startAxisParam === null) {return false;}

    this.lengthDrag = {
      pointId: this.activeTarget.pointId,
      key,
      dir,
      startLength,
      startAxisParam,
    };
    return true;
  }

  updateLengthDrag(ray: Ray): void {
    const drag = this.lengthDrag;
    if (!drag || !this.activeEntityId) {return;}
    const runtime = this.registry.getRuntime(this.activeEntityId);
    const params = runtime?.entity.patchParams;
    const node = params ? findPatchPoint(params, drag.pointId) : undefined;
    if (!runtime || !params || !node) {return;}

    const origin = new Vector3(node.pos.x, node.pos.y, node.pos.z);
    const t = closestAxisParamToRay(origin, drag.dir, this.toEntityLocalRay(ray, runtime.object));
    if (t === null) {return;}

    const length = Math.max(MIN_HANDLE_LENGTH_M, drag.startLength + t - drag.startAxisParam);
    const tip = origin.addScaledVector(drag.dir, length);
    this.commitPoint(this.activeEntityId, {
      ...node,
      [drag.key]: { x: tip.x, y: tip.y, z: tip.z },
    });
  }

  endLengthDrag(): void {
    this.lengthDrag = null;
  }

  private lengthRingBoundingSphere(): Sphere {
    const geometry = this.lengthRing.geometry;
    geometry.computeBoundingSphere();
    const sphere = geometry.boundingSphere;
    if (!sphere) {throw new Error('length ring has no bounding sphere');}
    return sphere.clone().applyMatrix4(this.lengthRing.matrixWorld);
  }

  private toEntityLocalRay(ray: Ray, entityObject: Object3D): Ray {
    const local = ray.clone().applyMatrix4(entityObject.matrixWorld.clone().invert());
    local.direction.normalize();
    return local;
  }

  getPickables(): Mesh[] {
    return this.helperGroup.visible ? this.handleMeshes.filter((mesh) => mesh.visible) : [];
  }

  getActiveEntityId(): string | null {
    return this.activeEntityId;
  }

  getActiveTarget(): PatchSubTarget | null {
    return this.activeTarget;
  }

  getActiveHandleMesh(): Mesh | null {
    if (!this.activeTarget || !this.helperGroup.visible) {return null;}
    const { pointId, targetKey } = this.activeTarget;
    const corner = this.pointHelpers.get(pointId);
    if (!corner) {return null;}
    return corner[targetKey === 'pos' ? 'anchor' : targetKey];
  }

  setActiveEntity(entityId: string | null): void {
    if (this.activeEntityId === entityId) {return;}
    this.activeEntityId = entityId;

    if (!entityId) {
      this.helperGroup.visible = false;
      this.activeTarget = null;
      this.lengthDrag = null;
      this.clearHelpers();
      return;
    }

    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isPatchAssetKind(runtime.entity.assetKind)) {
      this.helperGroup.visible = false;
      this.activeTarget = null;
      this.lengthDrag = null;
      this.clearHelpers();
      return;
    }

    this.helperGroup.visible = true;
    this.syncHelpersFromEntity();
  }

  selectTarget(target: PatchSubTarget | null): void {
    this.activeTarget = target;
    this.lengthDrag = null;
    this.syncLengthRing();
  }

  selectHandleByMesh(mesh: Mesh): PatchSubTarget | null {
    const { role, pointId, targetKey } = mesh.userData as {
      role?: string;
      pointId?: string;
      targetKey?: PatchHandleTarget;
    };
    if (role !== PATCH_GIZMO_HANDLE_ROLE || pointId === undefined || !targetKey || !this.activeEntityId) {
      return null;
    }

    this.activeTarget = {
      entityId: this.activeEntityId,
      pointId,
      targetKey,
    };
    this.syncLengthRing();
    return this.activeTarget;
  }

  /** Removes every per-point helper set (e.g. after the active patch was deleted). */
  clearHelpers(): void {
    for (const helpers of this.pointHelpers.values()) {this.disposePointHelpers(helpers);}
    this.pointHelpers.clear();
    this.handleMeshes.length = 0;
    this.lengthRing.visible = false;
  }

  /**
   * Per-frame sync: keeps helpers glued to the patch while it moves (gizmo, panel,
   * physics, undo) and drops them once the active patch no longer exists.
   */
  updateFrame(): void {
    if (!this.activeEntityId || !this.helperGroup.visible) {return;}
    if (!this.registry.getRuntime(this.activeEntityId)) {
      this.setActiveEntity(null);
      return;
    }
    this.syncHelpersFromEntity();
  }

  syncHelpersFromEntity(): void {
    if (!this.activeEntityId) {return;}
    const runtime = this.registry.getRuntime(this.activeEntityId);
    if (!runtime?.entity.patchParams) {return;}

    const params = runtime.entity.patchParams;
    const parentObject = runtime.object;

    // HelperGroup in the local or world space of the entity object
    parentObject.updateMatrixWorld(true);

    this.ensurePointHelpers(params);
    const linkedIds = new Set((params.edgeLinks ?? []).flatMap((l) => [l.startPointId, l.endPointId]));
    for (const node of params.points) {
      const h = this.pointHelpers.get(node.id);
      if (!h) {continue;}

      const toWorld = (v: Vec3) =>
        new Vector3(v.x, v.y, v.z).applyMatrix4(parentObject.matrixWorld);
      const pPos = toWorld(node.pos);
      const pNext = toWorld(node.handleNext);
      const pPrev = toWorld(node.handlePrev);
      const pCrossIn = toWorld(node.handleCrossIn);
      // Shared point: one point with all its handles - the node's handles this patch does
      // not map itself are shown here too (normal colors).
      const extra = this.nodeExtras(node);
      const pCrossOut = extra.yellow ?? pPos;
      h.handleCrossOut.visible = extra.yellow !== null;
      h.sharedPink.visible = extra.pink !== null;
      h.lineSharedPink.visible = extra.pink !== null;
      if (extra.pink) {
        h.sharedPink.position.copy(extra.pink);
        h.lineSharedPink.geometry.setFromPoints([pPos, extra.pink]);
      }

      h.anchor.position.copy(pPos);
      // Shared point marker: a ring around the anchor while the point is coupled.
      h.jointRing.visible = linkedIds.has(node.id) && node.joint === 'smooth';
      h.jointRing.position.copy(pPos);
      h.handleNext.position.copy(pNext);
      h.handlePrev.position.copy(pPrev);
      h.handleCrossIn.position.copy(pCrossIn);
      h.handleCrossOut.position.copy(pCrossOut);

      h.lineNext.geometry.setFromPoints([pPos, pNext]);
      h.linePrev.geometry.setFromPoints([pPos, pPrev]);
      h.lineCross.geometry.setFromPoints(extra.yellow ? [pCrossIn, pPos, pCrossOut] : [pCrossIn, pPos, pPos]);
    }
    this.syncLengthRing();
  }

  /**
   * Called after the user moved a handle mesh with the transform gizmo.
   */
  applyHandleTransform(gizmoMode: 'translate' | 'rotate'): boolean {
    if (!this.activeEntityId || !this.activeTarget) {return false;}
    const runtime = this.registry.getRuntime(this.activeEntityId);
    if (!runtime?.entity.patchParams) {return false;}

    const params = runtime.entity.patchParams;
    const targetKey = this.activeTarget.targetKey;
    const currentNode = findPatchPoint(params, this.activeTarget.pointId);
    if (!currentNode) {return false;}
    // Entities are immutable: edit a copy of the node and commit it through the registry.
    const node = structuredClone(currentNode);

    const parentObject = runtime.object;
    parentObject.updateMatrixWorld(true);
    const invParent = parentObject.matrixWorld.clone().invert();

    const corner = this.pointHelpers.get(currentNode.id);
    const movedMesh = this.getActiveHandleMesh();
    if (!movedMesh || !corner) {return false;}

    // New local point relative to the asset
    const newLocal = movedMesh.position.clone().applyMatrix4(invParent);

    if (targetKey === 'pos') {
      if (gizmoMode === 'rotate') {
        // Rotate around anchor node: rotate all 4 handles relatively
        const deltaQ = corner.anchor.quaternion.clone();
        corner.anchor.quaternion.identity();

        const p0 = new Vector3(node.pos.x, node.pos.y, node.pos.z);
        const keys: ('handleNext' | 'handlePrev' | 'handleCrossIn' | 'handleCrossOut')[] = [
          'handleNext',
          'handlePrev',
          'handleCrossIn',
          'handleCrossOut',
        ];
        for (const k of keys) {
          const rel = new Vector3(node[k].x, node[k].y, node[k].z).sub(p0).applyQuaternion(deltaQ);
          node[k].x = p0.x + rel.x;
          node[k].y = p0.y + rel.y;
          node[k].z = p0.z + rel.z;
        }
      } else {
        // Translation: translate all 4 handles rigidly
        const delta = new Vector3(newLocal.x - node.pos.x, newLocal.y - node.pos.y, newLocal.z - node.pos.z);
        node.pos.x = newLocal.x;
        node.pos.y = newLocal.y;
        node.pos.z = newLocal.z;

        const keys: ('handleNext' | 'handlePrev' | 'handleCrossIn' | 'handleCrossOut')[] = [
          'handleNext',
          'handlePrev',
          'handleCrossIn',
          'handleCrossOut',
        ];
        for (const k of keys) {
          node[k].x += delta.x;
          node[k].y += delta.y;
          node[k].z += delta.z;
        }
      }
    } else {
      // Shift while dragging frees the pair of the dragged handle (yellow or pink).
      const shared = this.nodeAndUse(node);
      if (isShiftHeld() && shared) {
        const pair = pairOfOwnHandle(shared.node, shared.use, targetKey);
        if (pair === 'yellow') {node.joint = 'corner';}
        if (pair === 'pink') {node.pinkPair = 'free';}
      }
      if (targetKey === 'handleCrossOut' || targetKey === 'sharedPink') {
        // Extra handle of a shared point: edit the node directly (Shift frees its pair).
        this.moveNodeExtra(node, targetKey === 'handleCrossOut' ? 'yellow' : 'pink', movedMesh.position);
        return true;
      }
      node[targetKey].x = newLocal.x;
      node[targetKey].y = newLocal.y;
      node[targetKey].z = newLocal.z;
      // Every handle moves on its own; on a shared point the node turns coupled partners.
      this.commitPoint(this.activeEntityId, node);
      return true;
    }

    this.commitPoint(this.activeEntityId, node);
    return true;
  }

  private nodeAndUse(point: PatchPoint): { node: PatchNode; use: PatchNodeUse } | null {
    if (!point.nodeId || !this.activeEntityId) {return null;}
    const node = this.registry.getPatchNodes().find((n) => n.id === point.nodeId);
    const use = node?.uses.find((u) => u.entityId === this.activeEntityId && u.pointId === point.id);
    return node && use ? { node, use } : null;
  }

  /** World tips of the node handles this patch does not map (other yellow / pink). */
  private nodeExtras(point: PatchPoint): { yellow: Vector3 | null; pink: Vector3 | null } {
    const found = this.nodeAndUse(point);
    if (!found) {return { yellow: null, pink: null };}
    const slots = extraSlotsFor(found.node, found.use);
    const tip = (slot: string | null) => {
      if (!slot) {return null;}
      const w = nodeSlotWorld(found.node, slot);
      return new Vector3(w.x, w.y, w.z);
    };
    return { yellow: tip(slots.yellow), pink: tip(slots.pink) };
  }

  private moveNodeExtra(point: PatchPoint, which: 'yellow' | 'pink', world: Vector3): void {
    const found = this.nodeAndUse(point);
    if (!found) {return;}
    const slot = extraSlotsFor(found.node, found.use)[which];
    if (!slot) {return;}
    const p = found.node.pos;
    const offset = { x: world.x - p.x, y: world.y - p.y, z: world.z - p.z };
    const next = setNodeSlot(found.node, slot, offset, isShiftHeld());
    this.registry.setPatchNodes(this.registry.getPatchNodes().map((n) => (n.id === next.id ? next : n)));
    this.syncHelpersFromEntity();
  }

  /** Entities are immutable: replaces one point through the registry, then resyncs helpers. */
  private commitPoint(entityId: string, point: PatchPoint): void {
    const params = this.registry.getRuntime(entityId)?.entity.patchParams;
    if (!params) {return;}
    this.commitParams(entityId, { points: replacePatchPoint(params.points, point) });
  }

  /** Commits a params change through the registry, resyncs helpers and notifies the listener. */
  commitParams(entityId: string, partial: Partial<PatchParams>): void {
    this.registry.setKindParams('patch', entityId, partial);
    this.syncHelpersFromEntity();
    const updatedParams = this.registry.getRuntime(entityId)?.entity.patchParams;
    if (updatedParams) {
      this.onPatchChange?.(entityId, updatedParams);
    }
  }

  dispose(): void {
    this.scene.remove(this.helperGroup);
  }
}

