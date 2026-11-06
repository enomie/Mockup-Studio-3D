import type { Vec3 } from '@/scene/entity-types';
import {
  BufferGeometry,
  Euler,
  Group,
  Line,
  LineBasicNodeMaterial,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  Object3D,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Material,
  type Ray,
  type Sphere,
  type Scene,
} from 'three/webgpu';
import {
  findPatchPoint,
  getPatchMirrorSigns,
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
  isNodeIdOf,
} from '@/scene/patch-nodes';
import { groupTransformMatrix, patchPointsCenter, togglePointId, transformPatchPoints } from '@/scene/triangle-patch-group-edit';

const PATCH_GIZMO_HANDLE_ROLE = 'patchGizmoHandle';

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

/** Two or more anchors of one patch selected together (scene space). */
export interface PatchPointGroupState {
  entityId: string;
  pointIds: string[];
  /** Mean of the selected anchors (scene space, m). */
  center: Vec3;
  /** Rotation since the selection was formed (radians, XYZ). */
  rotation: Vec3;
  /** Uniform scale since the selection was formed (1 = 100 %). */
  scale: number;
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
  /** Anchors that are part of a multi-point selection. */
  groupAnchorMat: MeshBasicNodeMaterial;
  handleGeo: OctahedronGeometry;
  pinkMat: MeshBasicNodeMaterial;
  yellowMat: MeshBasicNodeMaterial;
  linePinkMat: LineBasicNodeMaterial;
  lineYellowMat: LineBasicNodeMaterial;
}

function overlayMeshMaterial(color: number, opacity: number): MeshBasicNodeMaterial {
  return new MeshBasicNodeMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

function overlayLineMaterial(color: number, opacity: number): LineBasicNodeMaterial {
  return new LineBasicNodeMaterial({
    color,
    transparent: true,
    opacity: 0.85 * opacity,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

/** `opacity` dims the whole set (mirror copy helpers are fainter than the original's). */
function createHelperResources(opacity: number): HelperResources {
  return {
    anchorGeo: new SphereGeometry(0.025, 16, 16),
    anchorMat: overlayMeshMaterial(0x0284c7, opacity),
    jointRingGeo: new TorusGeometry(0.038, 0.005, 8, 40),
    jointRingMat: overlayMeshMaterial(0x22c55e, opacity),
    // Edge points: purple and a bit smaller than the corners
    edgeAnchorGeo: new SphereGeometry(0.021, 16, 16),
    edgeAnchorMat: overlayMeshMaterial(0xa855f7, opacity),
    groupAnchorMat: overlayMeshMaterial(0xf97316, opacity),
    handleGeo: new OctahedronGeometry(0.018),
    pinkMat: overlayMeshMaterial(0xec4899, opacity),
    yellowMat: overlayMeshMaterial(0xeab308, opacity),
    linePinkMat: overlayLineMaterial(0xec4899, opacity),
    lineYellowMat: overlayLineMaterial(0xeab308, opacity),
  };
}

/** One full set of point helpers: the original's, or one mirror copy's (`sign` flips world axes). */
interface HelperSet {
  /** Sign key of the mirror copy; null for the original. */
  key: string | null;
  sign: Vec3 | null;
  resources: HelperResources;
  helpers: Map<string, PointHelpers>;
}

function mirrorKeyOf(sign: Vec3): string {
  return `${sign.x},${sign.y},${sign.z}`;
}

/** Mirrors a scene-space vector in place across the world planes given by `sign` (a pure reflection is its own inverse). */
function applyMirrorSign(vector: Vector3, sign: Vec3 | null): Vector3 {
  if (sign) {vector.set(vector.x * sign.x, vector.y * sign.y, vector.z * sign.z);}
  return vector;
}

export class TrianglePatchGizmoController {
  private readonly scene: Scene;
  private readonly registry: EntityRegistry;
  private activeEntityId: string | null = null;
  private activeTarget: PatchSubTarget | null = null;
  /** Anchors selected together; the active target's point is always one of them. */
  private selectedPointIds: string[] = [];
  /** Sign key of the mirror copy whose helper is being edited; null while editing the original's. */
  private activeMirrorKey: string | null = null;
  /** Group rotation/scale relative to when the current point set was formed. */
  private groupKey = '';
  private readonly groupQuaternion = new Quaternion();
  private groupScale = 1;
  /** Invisible gizmo target at the centre of a multi-point selection (scene space). */
  private readonly groupPivot = new Object3D();
  private groupDrag: { points: PatchPoint[]; startInverse: Matrix4; startQuaternion: Quaternion } | null = null;

  // Root group for all visual helper nodes in the scene
  private readonly helperGroup: Group;

  // Track created handle meshes for raycasting & picking
  private readonly handleMeshes: Mesh[] = [];

  // Helper meshes per patch point id, created and removed as points come and go
  private readonly pointHelpers = new Map<string, PointHelpers>();
  private readonly helperResources: HelperResources;
  private readonly mirrorResources: HelperResources;
  private readonly originalSet: HelperSet;
  /** Fainter helper sets on the mirror copies, keyed by sign; edits map back to the original's data. */
  private readonly mirrorSets = new Map<string, HelperSet>();

  /** Glowing ring on the active lever line: drag it to change only the lever length. */
  private readonly lengthRing: Mesh;
  /** Shift state for Shift+drag (break a smooth joint); tracked on window, the gizmo has no event. */
  private shiftHeld = false;
  private readonly windowListeners = new AbortController();
  private lengthDrag: LengthDragState | null = null;

  private onPatchChange?: (entityId: string, params: PatchParams) => void;

  constructor(scene: Scene, registry: EntityRegistry) {
    this.scene = scene;
    this.registry = registry;
    this.helperGroup = new Group();
    this.helperGroup.name = 'PatchGizmoHelperGroup';
    this.scene.add(this.helperGroup);
    this.helperGroup.visible = false;
    this.groupPivot.name = 'PatchPointGroupPivot';
    this.scene.add(this.groupPivot);

    this.helperResources = createHelperResources(1);
    this.mirrorResources = createHelperResources(0.55);
    this.originalSet = { key: null, sign: null, resources: this.helperResources, helpers: this.pointHelpers };
    this.lengthRing = this.createLengthRing();
    this.trackShiftKey();
  }

  private trackShiftKey(): void {
    if (typeof window === 'undefined') {return;}
    const options = { capture: true, signal: this.windowListeners.signal };
    const track = (event: KeyboardEvent | PointerEvent) => { this.shiftHeld = event.shiftKey; };
    window.addEventListener('keydown', track, options);
    window.addEventListener('keyup', track, options);
    window.addEventListener('pointerdown', track, options);
    window.addEventListener('blur', () => { this.shiftHeld = false; }, { signal: this.windowListeners.signal });
  }

  setPatchChangeListener(listener: (entityId: string, params: PatchParams) => void): void {
    this.onPatchChange = listener;
  }

  private createPointHelpers(set: HelperSet, pointId: string, isCorner: boolean): PointHelpers {
    const { anchorGeo, anchorMat, edgeAnchorGeo, edgeAnchorMat, handleGeo, pinkMat, yellowMat, linePinkMat, lineYellowMat } =
      set.resources;
    const mirrorKey = set.key;
    const handleMesh = (geometry: BufferGeometry, material: MeshBasicNodeMaterial, targetKey: PatchHandleTarget) => {
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = false;
      mesh.renderOrder = 999;
      mesh.frustumCulled = false;
      mesh.userData = { role: PATCH_GIZMO_HANDLE_ROLE, pointId, targetKey, mirrorKey };
      return mesh;
    };
    const line = (pointCount: number, material: LineBasicNodeMaterial) => {
      const points = Array.from({ length: pointCount }, () => new Vector3());
      const mesh = new Line(new BufferGeometry().setFromPoints(points), material);
      mesh.renderOrder = 998;
      mesh.frustumCulled = false;
      return mesh;
    };

    const jointRing = new Mesh(set.resources.jointRingGeo, set.resources.jointRingMat);
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

  /** Keeps exactly one helper set per patch point, for the original and for every mirror copy. */
  private ensurePointHelpers(params: PatchParams): void {
    const signs = getPatchMirrorSigns(params.mirror);
    const wanted = new Set(signs.map(mirrorKeyOf));
    for (const [key, set] of this.mirrorSets) {
      if (!wanted.has(key)) {
        this.clearSet(set);
        this.mirrorSets.delete(key);
      }
    }
    if (this.activeMirrorKey && !wanted.has(this.activeMirrorKey)) {this.activeMirrorKey = null;}
    for (const sign of signs) {
      const key = mirrorKeyOf(sign);
      if (!this.mirrorSets.has(key)) {
        this.mirrorSets.set(key, { key, sign, resources: this.mirrorResources, helpers: new Map() });
      }
    }

    this.handleMeshes.length = 0;
    for (const set of this.allSets()) {
      this.ensureSetHelpers(set, params);
    }
  }

  private allSets(): HelperSet[] {
    return [this.originalSet, ...this.mirrorSets.values()];
  }

  private ensureSetHelpers(set: HelperSet, params: PatchParams): void {
    const { points } = params;
    const ids = new Set(points.map((point) => point.id));
    for (const [id, helpers] of set.helpers) {
      if (!ids.has(id)) {
        this.disposePointHelpers(helpers);
        set.helpers.delete(id);
      }
    }
    for (const point of points) {
      if (!set.helpers.has(point.id)) {
        set.helpers.set(point.id, this.createPointHelpers(set, point.id, isPatchCorner(params, point.id)));
      }
    }
    for (const point of points) {
      const h = set.helpers.get(point.id);
      if (h) {this.handleMeshes.push(h.anchor, h.handleNext, h.handlePrev, h.handleCrossIn, h.handleCrossOut, h.sharedPink);}
    }
  }

  private clearSet(set: HelperSet): void {
    for (const helpers of set.helpers.values()) {this.disposePointHelpers(helpers);}
    set.helpers.clear();
  }

  /** The helper set the user is currently editing (a mirror copy's or the original's). */
  private activeSet(): HelperSet {
    return (this.activeMirrorKey ? this.mirrorSets.get(this.activeMirrorKey) : undefined) ?? this.originalSet;
  }

  /** Matrix from the patch's local space to scene space on the side being edited (mirror copy or original). */
  private activeLocalToWorld(entityObject: Object3D): Matrix4 {
    entityObject.updateMatrixWorld(true);
    const sign = this.activeSet().sign;
    const base = entityObject.matrixWorld.clone();
    return sign ? new Matrix4().makeScale(sign.x, sign.y, sign.z).multiply(base) : base;
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
    const corner = this.activeTarget ? this.activeSet().helpers.get(this.activeTarget.pointId) : undefined;
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

    const startAxisParam = closestAxisParamToRay(origin, dir, this.toLocalRay(ray, this.activeLocalToWorld(runtime.object)));
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
    const t = closestAxisParamToRay(origin, drag.dir, this.toLocalRay(ray, this.activeLocalToWorld(runtime.object)));
    if (t === null) {return;}

    const length = Math.max(MIN_HANDLE_LENGTH_M, drag.startLength + t - drag.startAxisParam);
    const tip = origin.addScaledVector(drag.dir, length);
    this.commitPoint(this.activeEntityId, {
      ...node,
      [drag.key]: { x: tip.x, y: tip.y, z: tip.z },
    });
  }

  isLengthDragging(): boolean {
    return this.lengthDrag !== null;
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

  private toLocalRay(ray: Ray, localToWorld: Matrix4): Ray {
    const local = ray.clone().applyMatrix4(localToWorld.clone().invert());
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
    const corner = this.activeSet().helpers.get(pointId);
    if (!corner) {return null;}
    return corner[targetKey === 'pos' ? 'anchor' : targetKey];
  }

  setActiveEntity(entityId: string | null): void {
    if (this.activeEntityId === entityId) {return;}
    this.activeEntityId = entityId;
    this.selectedPointIds = [];
    this.activeMirrorKey = null;
    this.groupDrag = null;

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
    this.selectedPointIds = target ? [target.pointId] : [];
    this.activeMirrorKey = null;
    this.lengthDrag = null;
    this.syncHelpersFromEntity();
  }

  /** Shift-click on an anchor: adds it to the point selection or removes it. */
  togglePointSelection(pointId: string): void {
    if (!this.activeEntityId) {return;}
    const target = this.activeTarget;
    const base = target?.targetKey === 'pos' ? this.selectedPointIds : target ? [target.pointId] : [];
    const ids = togglePointId(base, pointId);
    this.selectedPointIds = ids;
    // The group gizmo lives on the original only.
    this.activeMirrorKey = null;
    const active = ids.includes(pointId) ? pointId : ids[ids.length - 1];
    this.activeTarget = { entityId: this.activeEntityId, pointId: active, targetKey: 'pos' };
    this.lengthDrag = null;
    this.syncHelpersFromEntity();
  }

  getSelectedPointIds(): readonly string[] {
    return this.selectedPointIds;
  }

  /** True while two or more anchors of the active patch are selected. */
  isGroupActive(): boolean {
    return this.helperGroup.visible && this.activeTarget?.targetKey === 'pos' && this.selectedPointIds.length > 1;
  }

  getGroupPivot(): Object3D | null {
    return this.isGroupActive() ? this.groupPivot : null;
  }

  selectHandleByMesh(mesh: Mesh): PatchSubTarget | null {
    const { role, pointId, targetKey, mirrorKey } = mesh.userData as {
      role?: string;
      pointId?: string;
      targetKey?: PatchHandleTarget;
      mirrorKey?: string | null;
    };
    if (role !== PATCH_GIZMO_HANDLE_ROLE || pointId === undefined || !targetKey || !this.activeEntityId) {
      return null;
    }

    if (this.shiftHeld && targetKey === 'pos') {
      this.togglePointSelection(pointId);
      return this.activeTarget;
    }
    this.activeTarget = {
      entityId: this.activeEntityId,
      pointId,
      targetKey,
    };
    this.selectedPointIds = [pointId];
    // A handle on a mirror copy selects the original's point and remembers the copy being dragged.
    this.activeMirrorKey = mirrorKey ?? null;
    this.syncHelpersFromEntity();
    return this.activeTarget;
  }

  /** Removes every per-point helper set (e.g. after the active patch was deleted). */
  clearHelpers(): void {
    for (const set of this.allSets()) {this.clearSet(set);}
    this.mirrorSets.clear();
    this.activeMirrorKey = null;
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
    for (const set of this.allSets()) {
      for (const node of params.points) {
        const h = set.helpers.get(node.id);
        if (!h) {continue;}
        this.syncPointHelpers(set, h, node, params, parentObject, linkedIds);
      }
    }
    this.selectedPointIds = this.selectedPointIds.filter((id) => params.points.some((point) => point.id === id));
    this.syncLengthRing();
    this.syncGroupPivot();
  }

  /** Places one point's helpers in scene space; a mirror set reflects every position across its world planes. */
  private syncPointHelpers(
    set: HelperSet,
    h: PointHelpers,
    node: PatchPoint,
    params: PatchParams,
    parentObject: Object3D,
    linkedIds: ReadonlySet<string>,
  ): void {
    const toWorld = (v: Vec3) =>
      applyMirrorSign(new Vector3(v.x, v.y, v.z).applyMatrix4(parentObject.matrixWorld), set.sign);
    const pPos = toWorld(node.pos);
    const pNext = toWorld(node.handleNext);
    const pPrev = toWorld(node.handlePrev);
    const pCrossIn = toWorld(node.handleCrossIn);
    // Shared point: one point with all its handles - the node's handles this patch does
    // not map itself are shown here too (normal colors).
    const extra = this.nodeExtras(node);
    const extraYellow = extra.yellow ? applyMirrorSign(extra.yellow, set.sign) : null;
    const extraPink = extra.pink ? applyMirrorSign(extra.pink, set.sign) : null;
    const pCrossOut = extraYellow ?? pPos;
    h.handleCrossOut.visible = extraYellow !== null;
    h.sharedPink.visible = extraPink !== null;
    h.lineSharedPink.visible = extraPink !== null;
    if (extraPink) {
      h.sharedPink.position.copy(extraPink);
      h.lineSharedPink.geometry.setFromPoints([pPos, extraPink]);
    }

    h.anchor.position.copy(pPos);
    h.anchor.material = this.anchorMaterial(params, node.id, set.resources);
    // Shared point marker: a ring around the anchor while the point is coupled.
    h.jointRing.visible = linkedIds.has(node.id) && node.joint === 'smooth';
    h.jointRing.position.copy(pPos);
    h.handleNext.position.copy(pNext);
    h.handlePrev.position.copy(pPrev);
    h.handleCrossIn.position.copy(pCrossIn);
    h.handleCrossOut.position.copy(pCrossOut);

    h.lineNext.geometry.setFromPoints([pPos, pNext]);
    h.linePrev.geometry.setFromPoints([pPos, pPrev]);
    h.lineCross.geometry.setFromPoints(extraYellow ? [pCrossIn, pPos, pCrossOut] : [pCrossIn, pPos, pPos]);
  }

  private anchorMaterial(params: PatchParams, pointId: string, r: HelperResources): MeshBasicNodeMaterial {
    if (this.isGroupActive() && this.selectedPointIds.includes(pointId)) {return r.groupAnchorMat;}
    return isPatchCorner(params, pointId) ? r.anchorMat : r.edgeAnchorMat;
  }

  /** Scene-space centre of the selected anchors; null without a group. */
  private groupCenterWorld(): Vector3 | null {
    const runtime = this.activeEntityId ? this.registry.getRuntime(this.activeEntityId) : undefined;
    const params = runtime?.entity.patchParams;
    if (!runtime || !params || !this.isGroupActive()) {return null;}
    const center = patchPointsCenter(params.points, this.selectedPointIds);
    if (!center) {return null;}
    runtime.object.updateMatrixWorld(true);
    return new Vector3(center.x, center.y, center.z).applyMatrix4(runtime.object.matrixWorld);
  }

  /** Keeps the group pivot on the centre of the selected anchors (not while dragging it). */
  private syncGroupPivot(): void {
    if (this.groupDrag) {return;}
    const key = this.isGroupActive() ? `${this.activeEntityId ?? ''}:${[...this.selectedPointIds].sort().join('|')}` : '';
    if (key !== this.groupKey) {
      this.groupKey = key;
      this.groupQuaternion.identity();
      this.groupScale = 1;
    }
    const center = this.groupCenterWorld();
    if (!center) {return;}
    this.groupPivot.position.copy(center);
    this.groupPivot.quaternion.identity();
    this.groupPivot.scale.set(1, 1, 1);
    this.groupPivot.updateMatrixWorld();
  }

  /** Group panel values; null unless two or more anchors are selected. */
  getGroupState(): PatchPointGroupState | null {
    const center = this.groupCenterWorld();
    if (!center || !this.activeEntityId) {return null;}
    const euler = new Euler().setFromQuaternion(this.groupQuaternion);
    return {
      entityId: this.activeEntityId,
      pointIds: [...this.selectedPointIds],
      center: { x: center.x, y: center.y, z: center.z },
      rotation: { x: euler.x, y: euler.y, z: euler.z },
      scale: this.groupScale,
    };
  }

  /** Moves the selected points so their centre lands on `center` (scene space). */
  setGroupCenter(center: Vec3): void {
    const current = this.groupCenterWorld();
    if (!current) {return;}
    this.applyGroupWorldMatrix(new Matrix4().makeTranslation(center.x - current.x, center.y - current.y, center.z - current.z));
  }

  /** Turns the selected points about their centre to the relative rotation `rotation` (radians, XYZ). */
  setGroupRotation(rotation: Vec3): void {
    const current = this.groupCenterWorld();
    if (!current) {return;}
    const target = new Quaternion().setFromEuler(new Euler(rotation.x, rotation.y, rotation.z));
    const delta = target.clone().multiply(this.groupQuaternion.clone().invert());
    this.applyGroupWorldMatrix(groupTransformMatrix(current, delta, 1));
    this.groupQuaternion.copy(target);
  }

  /** Scales the selected points about their centre to the relative uniform scale `scale`. */
  setGroupScale(scale: number): void {
    const current = this.groupCenterWorld();
    if (!current || scale <= 0) {return;}
    this.applyGroupWorldMatrix(groupTransformMatrix(current, new Quaternion(), scale / this.groupScale));
    this.groupScale = scale;
  }

  beginGroupDrag(): void {
    const params = this.activeEntityId ? this.registry.getRuntime(this.activeEntityId)?.entity.patchParams : undefined;
    if (!params || !this.isGroupActive()) {return;}
    this.groupPivot.updateMatrixWorld();
    this.groupDrag = {
      points: params.points,
      startInverse: this.groupPivot.matrixWorld.clone().invert(),
      startQuaternion: this.groupPivot.quaternion.clone(),
    };
  }

  /** Applies the pivot's change since the drag started to the selected points. */
  updateGroupDrag(): void {
    const drag = this.groupDrag;
    if (!drag) {return;}
    this.groupPivot.updateMatrixWorld();
    const world = this.groupPivot.matrixWorld.clone().multiply(drag.startInverse);
    this.applyGroupWorldMatrix(world, drag.points);
  }

  endGroupDrag(): void {
    const drag = this.groupDrag;
    if (!drag) {return;}
    const delta = this.groupPivot.quaternion.clone().multiply(drag.startQuaternion.clone().invert());
    this.groupQuaternion.premultiply(delta);
    this.groupScale *= this.groupPivot.scale.x;
    this.groupDrag = null;
    this.syncGroupPivot();
  }

  /** Applies a scene-space transform to the selected points (from `basePoints`, default: current). */
  private applyGroupWorldMatrix(world: Matrix4, basePoints?: readonly PatchPoint[]): void {
    if (!this.activeEntityId) {return;}
    const runtime = this.registry.getRuntime(this.activeEntityId);
    const params = runtime?.entity.patchParams;
    if (!runtime || !params) {return;}
    runtime.object.updateMatrixWorld(true);
    const toWorld = runtime.object.matrixWorld;
    const local = toWorld.clone().invert().multiply(world).multiply(toWorld);
    const points = transformPatchPoints(basePoints ?? params.points, this.selectedPointIds, local);
    this.commitParams(this.activeEntityId, { points });
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
    // On a mirror copy the dragged mesh lives in mirrored space: map it back into the patch's local space.
    const sign = this.activeSet().sign;
    const invParent = this.activeLocalToWorld(parentObject).invert();

    const corner = this.activeSet().helpers.get(currentNode.id);
    const movedMesh = this.getActiveHandleMesh();
    if (!movedMesh || !corner) {return false;}

    // New local point relative to the asset
    const newLocal = movedMesh.position.clone().applyMatrix4(invParent);

    if (targetKey === 'pos') {
      if (gizmoMode === 'rotate') {
        // Rotate around anchor node: rotate all 4 handles relatively
        const deltaQ = this.originalSpaceRotation(corner.anchor.quaternion, sign);
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
      if (this.shiftHeld && shared) {
        const pair = pairOfOwnHandle(shared.node, shared.use, targetKey);
        if (pair === 'yellow') {node.joint = 'corner';}
        if (pair === 'pink') {node.pinkPair = 'free';}
      }
      if (targetKey === 'handleCrossOut' || targetKey === 'sharedPink') {
        // Extra handle of a shared point: edit the node directly (Shift frees its pair).
        this.moveNodeExtra(node, targetKey === 'handleCrossOut' ? 'yellow' : 'pink', applyMirrorSign(movedMesh.position.clone(), sign));
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

  /** A rotation seen in mirrored space, expressed in the original's space (M R M for a pure reflection M). */
  private originalSpaceRotation(rotation: Quaternion, sign: Vec3 | null): Quaternion {
    if (!sign) {return rotation.clone();}
    const mirror = new Matrix4().makeScale(sign.x, sign.y, sign.z);
    const conjugated = mirror.clone().multiply(new Matrix4().makeRotationFromQuaternion(rotation)).multiply(mirror);
    return new Quaternion().setFromRotationMatrix(conjugated);
  }

  private nodeAndUse(point: PatchPoint): { node: PatchNode; use: PatchNodeUse } | null {
    if (!point.nodeId || !this.activeEntityId) {return null;}
    const node = this.registry.getPatchNodes().find((n) => isNodeIdOf(n, point.nodeId));
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
    const next = setNodeSlot(found.node, slot, offset, this.shiftHeld);
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
    this.windowListeners.abort();
    this.clearHelpers();
    this.scene.remove(this.helperGroup);
    this.scene.remove(this.groupPivot);
    for (const resources of [this.helperResources, this.mirrorResources]) {
      for (const resource of Object.values(resources) as { dispose(): void }[]) {resource.dispose();}
    }
    this.lengthRing.geometry.dispose();
    (this.lengthRing.material as Material).dispose();
  }
}

