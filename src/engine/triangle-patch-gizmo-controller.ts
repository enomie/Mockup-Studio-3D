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
import type {
  PatchHandleSelection,
  PatchHandleTarget,
  PatchNodeData,
  TrianglePatchParams,
} from '@/scene/asset-triangle-patch';
import type { EntityRegistry } from './entity-registry';

export const PATCH_GIZMO_HANDLE_ROLE = 'patchGizmoHandle';

/** Shortest handle length the ring drag allows (entity-local meters). */
const MIN_HANDLE_LENGTH_M = 0.002;
const RING_AXIS = new Vector3(0, 0, 1);

type LeverKey = Exclude<PatchHandleTarget, 'pos'>;

interface LengthDragState {
  nodeIndex: number;
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

export class TrianglePatchGizmoController {
  private readonly scene: Scene;
  private readonly registry: EntityRegistry;
  private activeEntityId: string | null = null;
  private activeTarget: PatchSubTarget | null = null;

  // Root group for all visual helper nodes in the scene
  private readonly helperGroup: Group;

  // Track created handle meshes for raycasting & picking
  private readonly handleMeshes: Mesh[] = [];

  // Corner helper meshes per corner index (0, 1, 2)
  private readonly cornerHelpers: {
    anchor: Mesh;
    handleNext: Mesh;
    handlePrev: Mesh;
    handleCrossIn: Mesh;
    handleCrossOut: Mesh;
    lineNext: Line;
    linePrev: Line;
    lineCross: Line;
  }[] = [];

  /** Glowing ring on the active lever line: drag it to change only the lever length. */
  private readonly lengthRing: Mesh;
  private lengthDrag: LengthDragState | null = null;

  private onPatchChange?: (entityId: string, params: TrianglePatchParams) => void;

  constructor(scene: Scene, registry: EntityRegistry) {
    this.scene = scene;
    this.registry = registry;
    this.helperGroup = new Group();
    this.helperGroup.name = 'PatchGizmoHelperGroup';
    this.scene.add(this.helperGroup);
    this.helperGroup.visible = false;

    this.createHelperMeshes();
    this.lengthRing = this.createLengthRing();
  }

  setPatchChangeListener(listener: (entityId: string, params: TrianglePatchParams) => void): void {
    this.onPatchChange = listener;
  }

  private createHelperMeshes(): void {
    const anchorGeo = new SphereGeometry(0.025, 16, 16);
    const anchorMat = new MeshBasicNodeMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    const handleGeo = new OctahedronGeometry(0.018);
    const pinkMat = new MeshBasicNodeMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const yellowMat = new MeshBasicNodeMaterial({
      color: 0xeab308,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    const linePinkMat = new LineBasicNodeMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const lineYellowMat = new LineBasicNodeMaterial({
      color: 0xeab308,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    for (let c = 0; c < 3; c++) {
      const anchor = new Mesh(anchorGeo, anchorMat);
      anchor.castShadow = false;
      anchor.renderOrder = 999;
      anchor.frustumCulled = false;
      anchor.userData = {
        role: PATCH_GIZMO_HANDLE_ROLE,
        nodeIndex: c,
        targetKey: 'pos' as PatchHandleTarget,
      };

      const handleNext = new Mesh(handleGeo, pinkMat);
      handleNext.renderOrder = 999;
      handleNext.frustumCulled = false;
      handleNext.userData = {
        role: PATCH_GIZMO_HANDLE_ROLE,
        nodeIndex: c,
        targetKey: 'handleNext' as PatchHandleTarget,
      };

      const handlePrev = new Mesh(handleGeo, pinkMat);
      handlePrev.renderOrder = 999;
      handlePrev.frustumCulled = false;
      handlePrev.userData = {
        role: PATCH_GIZMO_HANDLE_ROLE,
        nodeIndex: c,
        targetKey: 'handlePrev' as PatchHandleTarget,
      };

      const handleCrossIn = new Mesh(handleGeo, yellowMat);
      handleCrossIn.renderOrder = 999;
      handleCrossIn.frustumCulled = false;
      handleCrossIn.userData = {
        role: PATCH_GIZMO_HANDLE_ROLE,
        nodeIndex: c,
        targetKey: 'handleCrossIn' as PatchHandleTarget,
      };

      const handleCrossOut = new Mesh(handleGeo, yellowMat);
      handleCrossOut.renderOrder = 999;
      handleCrossOut.frustumCulled = false;
      handleCrossOut.userData = {
        role: PATCH_GIZMO_HANDLE_ROLE,
        nodeIndex: c,
        targetKey: 'handleCrossOut' as PatchHandleTarget,
      };

      const lineNext = new Line(new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]), linePinkMat);
      lineNext.renderOrder = 998;
      lineNext.frustumCulled = false;
      const linePrev = new Line(new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]), linePinkMat);
      linePrev.renderOrder = 998;
      linePrev.frustumCulled = false;
      const lineCross = new Line(new BufferGeometry().setFromPoints([new Vector3(), new Vector3(), new Vector3()]), lineYellowMat);
      lineCross.renderOrder = 998;
      lineCross.frustumCulled = false;

      this.helperGroup.add(anchor);
      this.helperGroup.add(handleNext);
      this.helperGroup.add(handlePrev);
      this.helperGroup.add(handleCrossIn);
      this.helperGroup.add(handleCrossOut);
      this.helperGroup.add(lineNext);
      this.helperGroup.add(linePrev);
      this.helperGroup.add(lineCross);

      this.handleMeshes.push(anchor, handleNext, handlePrev, handleCrossIn, handleCrossOut);

      this.cornerHelpers.push({
        anchor,
        handleNext,
        handlePrev,
        handleCrossIn,
        handleCrossOut,
        lineNext,
        linePrev,
        lineCross,
      });
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
    return key && key !== 'pos' ? key : null;
  }

  private syncLengthRing(): void {
    const key = this.activeLeverKey();
    const corner = this.activeTarget ? this.cornerHelpers[this.activeTarget.nodeIndex] : undefined;
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
    const node = runtime?.entity.trianglePatchParams?.nodes[this.activeTarget.nodeIndex];
    if (!runtime || !node) {return false;}

    const origin = new Vector3(node.pos.x, node.pos.y, node.pos.z);
    const offset = new Vector3(node[key].x, node[key].y, node[key].z).sub(origin);
    const startLength = offset.length();
    if (startLength < 1e-9) {return false;}
    const dir = offset.divideScalar(startLength);

    const startAxisParam = closestAxisParamToRay(origin, dir, this.toEntityLocalRay(ray, runtime.object));
    if (startAxisParam === null) {return false;}

    this.lengthDrag = {
      nodeIndex: this.activeTarget.nodeIndex,
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
    const params = runtime?.entity.trianglePatchParams;
    const node = params?.nodes[drag.nodeIndex];
    if (!runtime || !params || !node) {return;}

    const origin = new Vector3(node.pos.x, node.pos.y, node.pos.z);
    const t = closestAxisParamToRay(origin, drag.dir, this.toEntityLocalRay(ray, runtime.object));
    if (t === null) {return;}

    const length = Math.max(MIN_HANDLE_LENGTH_M, drag.startLength + t - drag.startAxisParam);
    const tip = origin.addScaledVector(drag.dir, length);
    this.commitNode(this.activeEntityId, drag.nodeIndex, {
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
    return this.helperGroup.visible ? this.handleMeshes : [];
  }

  getActiveTarget(): PatchSubTarget | null {
    return this.activeTarget;
  }

  getActiveHandleMesh(): Mesh | null {
    if (!this.activeTarget || !this.helperGroup.visible) {return null;}
    const { nodeIndex, targetKey } = this.activeTarget;
    const corner = this.cornerHelpers.at(nodeIndex);
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
      return;
    }

    const runtime = this.registry.getRuntime(entityId);
    if (runtime?.entity.assetKind !== 'triangle-patch') {
      this.helperGroup.visible = false;
      this.activeTarget = null;
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
    const { role, nodeIndex, targetKey } = mesh.userData as {
      role?: string;
      nodeIndex?: number;
      targetKey?: PatchHandleTarget;
    };
    if (role !== PATCH_GIZMO_HANDLE_ROLE || nodeIndex === undefined || !targetKey || !this.activeEntityId) {
      return null;
    }

    this.activeTarget = {
      entityId: this.activeEntityId,
      nodeIndex,
      targetKey,
    };
    this.syncLengthRing();
    return this.activeTarget;
  }

  syncHelpersFromEntity(): void {
    if (!this.activeEntityId) {return;}
    const runtime = this.registry.getRuntime(this.activeEntityId);
    if (!runtime?.entity.trianglePatchParams) {return;}

    const params = runtime.entity.trianglePatchParams;
    const parentObject = runtime.object;

    // HelperGroup in the local or world space of the entity object
    parentObject.updateMatrixWorld(true);

    for (let c = 0; c < 3; c++) {
      const node = params.nodes.at(c);
      const h = this.cornerHelpers.at(c);
      if (!node || !h) {continue;}

      const toWorld = (v: Vec3) =>
        new Vector3(v.x, v.y, v.z).applyMatrix4(parentObject.matrixWorld);
      const pPos = toWorld(node.pos);
      const pNext = toWorld(node.handleNext);
      const pPrev = toWorld(node.handlePrev);
      const pCrossIn = toWorld(node.handleCrossIn);
      const pCrossOut = toWorld(node.handleCrossOut);

      h.anchor.position.copy(pPos);
      h.handleNext.position.copy(pNext);
      h.handlePrev.position.copy(pPrev);
      h.handleCrossIn.position.copy(pCrossIn);
      h.handleCrossOut.position.copy(pCrossOut);

      h.lineNext.geometry.setFromPoints([pPos, pNext]);
      h.linePrev.geometry.setFromPoints([pPos, pPrev]);
      h.lineCross.geometry.setFromPoints([pCrossIn, pPos, pCrossOut]);
    }
    this.syncLengthRing();
  }

  /**
   * Called after the user moved a handle mesh with the transform gizmo.
   */
  applyHandleTransform(gizmoMode: 'translate' | 'rotate'): boolean {
    if (!this.activeEntityId || !this.activeTarget) {return false;}
    const runtime = this.registry.getRuntime(this.activeEntityId);
    if (!runtime?.entity.trianglePatchParams) {return false;}

    const params = runtime.entity.trianglePatchParams;
    const nodeIndex = this.activeTarget.nodeIndex;
    const targetKey = this.activeTarget.targetKey;
    const currentNode = params.nodes.at(nodeIndex);
    if (!currentNode) {return false;}
    // Entities are immutable: edit a copy of the node and commit it through the registry.
    const node = structuredClone(currentNode);

    const parentObject = runtime.object;
    parentObject.updateMatrixWorld(true);
    const invParent = parentObject.matrixWorld.clone().invert();

    const corner = this.cornerHelpers[nodeIndex];
    const movedMesh = this.getActiveHandleMesh();
    if (!movedMesh) {return false;}

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
      // Handle moved
      node[targetKey].x = newLocal.x;
      node[targetKey].y = newLocal.y;
      node[targetKey].z = newLocal.z;

      // Seesaw counter-coupling for cross-tangents (CrossIn / CrossOut)
      if (targetKey === 'handleCrossIn' || targetKey === 'handleCrossOut') {
        const isCrossIn = targetKey === 'handleCrossIn';
        const activeKey = isCrossIn ? 'handleCrossIn' : 'handleCrossOut';
        const partnerKey = isCrossIn ? 'handleCrossOut' : 'handleCrossIn';

        const p0 = new Vector3(node.pos.x, node.pos.y, node.pos.z);
        const activeH = new Vector3(node[activeKey].x, node[activeKey].y, node[activeKey].z);
        const partnerH = new Vector3(node[partnerKey].x, node[partnerKey].y, node[partnerKey].z);

        const vOffset = activeH.clone().sub(p0);
        if (vOffset.length() > 0.0001) {
          const lenOpp = partnerH.distanceTo(p0);
          partnerH.copy(p0).addScaledVector(vOffset.normalize(), -lenOpp);
          node[partnerKey].x = partnerH.x;
          node[partnerKey].y = partnerH.y;
          node[partnerKey].z = partnerH.z;
        }
      }
    }

    this.commitNode(this.activeEntityId, nodeIndex, node);
    return true;
  }

  /** Entities are immutable: replaces one node through the registry, then resyncs helpers. */
  private commitNode(entityId: string, nodeIndex: number, node: PatchNodeData): void {
    const params = this.registry.getRuntime(entityId)?.entity.trianglePatchParams;
    if (!params) {return;}
    const nodes = params.nodes.map((entry, index) =>
      index === nodeIndex ? node : entry,
    ) as TrianglePatchParams['nodes'];
    this.registry.setKindParams('trianglePatch', entityId, { nodes });
    this.syncHelpersFromEntity();
    const updatedParams = this.registry.getRuntime(entityId)?.entity.trianglePatchParams;
    if (updatedParams) {
      this.onPatchChange?.(entityId, updatedParams);
    }
  }

  dispose(): void {
    this.scene.remove(this.helperGroup);
  }
}

