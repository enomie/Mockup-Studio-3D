import { Euler, Object3D, Quaternion, Vector3 } from 'three/webgpu';
import type { AssetEntity } from '@/scene/entity-types';
import type { AppMode } from '@/scene/scene-api';
import { isFabricClothAssetKind } from '@/scene/asset-fabric-cloth';
import { bakesUniformScaleIntoParams } from '@/scene/rigid-primitive-asset';
import { isWallAssetKind } from '@/scene/asset-wall';
import { clampSizeScale } from '@/scene/asset-sizing';
import { isPatchAssetKind } from '@/scene/asset-triangle-patch';
import { scalePatchPoints } from '@/scene/triangle-patch-recenter';
import type { AssetSystem } from './asset-system';
import type { CameraController } from './camera-controller';
import type { EntityRegistry } from './entity-registry';
import {
  applyGroupRigidDelta,
  applyGroupScale,
  groupCenter,
  type GroupMemberPose,
  type GroupMemberStart,
} from './multi-transform';
import type { FabricClothSimulationParticipant } from './fabric-cloth-simulation-participant';
import { fabricClothPinCornerIndex, fabricClothPinEntityId } from './fabric-cloth-pins';
import type { GizmoController } from './gizmo-controller';
import type { LightingSystem } from './lighting/lighting-system';
import type { TrianglePatchGizmoController } from './triangle-patch-gizmo-controller';
import type { ViewportInvalidation } from './viewport-invalidation';
import type { WorldPhysicsSessionController } from './world-physics-session';

export interface SelectionGroupState {
  /** Centre of the selected assets (scene space, m). */
  center: { x: number; y: number; z: number };
  /** Rotation since the selection was formed (radians, XYZ). */
  rotation: { x: number; y: number; z: number };
  /** Uniform scale since the selection was formed (1 = 100 %). */
  scale: number;
}

/** Fabric cloth has at most four pinnable corners (indices 0–3). */
const MAX_PIN_CORNER_INDEX = 3;

export interface GizmoInteractionDeps {
  gizmo: GizmoController;
  cameras: CameraController;
  registry: EntityRegistry;
  lighting: LightingSystem;
  patchGizmo: TrianglePatchGizmoController;
  assets: AssetSystem;
  worldPhysics: WorldPhysicsSessionController;
  fabricClothSimulation: FabricClothSimulationParticipant;
  viewportInvalidation: ViewportInvalidation;
  getMode: () => AppMode;
  /** While the patch add-point mode runs, no transform gizmo is shown. */
  isPatchAddPointActive: () => boolean;
  emit: () => void;
  syncFixedRigidPose: (entityId: string) => void;
  applyAssetMutation: (
    mutation: () => void | Promise<void>,
    options?: { refreshGizmo?: boolean },
  ) => void;
  /** A drag of a patch point or handle ended; the patch pivot follows its points. */
  onPatchPointDragEnd: (entityId: string) => void;
  /** Alt held at the start of a move drag: leave copies of these entities in place. */
  duplicateForAltDrag: (entityIds: readonly string[]) => void;
}

/**
 * Owns what the transform gizmo is attached to and turns gizmo drags into
 * edits of lights, patch handles, cloth pins and entity transforms or scale.
 */
export class GizmoInteractionController {
  private scaleDragBase = 1;
  private scaleCommitPending = false;
  private readonly fabricClothActivePinCorner = new Map<string, number>();
  /** Group rotation/scale relative to when the current multi-selection was formed. */
  private groupKey = '';
  private readonly groupQuaternion = new Quaternion();
  private groupScale = 1;
  /** Invisible gizmo target at the centre of a multi-selection. */
  private readonly groupPivot = new Object3D();
  private groupDrag: {
    members: (GroupMemberStart & { sizeScale: number })[];
    pivot: Vector3;
    quaternion: Quaternion;
  } | null = null;

  /** Alt (Option) state of the latest pointer press; read when a drag starts. */
  private altPressed = false;
  private readonly onPointerDownCapture = (event: PointerEvent): void => {
    this.altPressed = event.altKey;
  };

  constructor(private readonly deps: GizmoInteractionDeps) {
    window.addEventListener('pointerdown', this.onPointerDownCapture, { capture: true });
    deps.gizmo.setCallbacks({
      onTransform: () => { this.onTransform(); },
      onDraggingChanged: (dragging) => { this.onDraggingChanged(dragging); },
    });
  }

  dispose(): void {
    window.removeEventListener('pointerdown', this.onPointerDownCapture, { capture: true });
  }

  /** Alt-drag duplicate applies to plain asset moves (single or group), not lights or handles. */
  private maybeDuplicateForAltDrag(): void {
    if (!this.altPressed || this.deps.getMode() !== 'translate') {return;}
    this.altPressed = false;
    const { gizmo, registry, lighting, patchGizmo, worldPhysics } = this.deps;
    if (lighting.getSelectedLightId() || patchGizmo.getActiveTarget()) {return;}
    if (worldPhysics.getPhase() !== 'idle') {return;}
    const attached = gizmo.getAttachedObject();
    const selected = registry.getSelectedRuntime();
    if (attached !== this.groupPivot && attached !== selected?.object) {return;}
    this.deps.duplicateForAltDrag(registry.getSelectedEntityIds());
  }

  /** Re-targets the gizmo for the current mode and selection. */
  refresh(): void {
    const mode = this.deps.getMode();
    const { gizmo, lighting, registry, patchGizmo, worldPhysics, fabricClothSimulation } =
      this.deps;
    const selectedLightId = lighting.getSelectedLightId();
    const selectedAsset = registry.getSelectedRuntime();
    const selectedAssetObject =
      selectedAsset?.entity.visible !== false ? selectedAsset?.object ?? null : null;
    if (this.deps.isPatchAddPointActive()) {
      gizmo.setEnabled(false);
      gizmo.attach(null);
      return;
    }
    const patchGroupPivot = patchGizmo.getGroupPivot();
    if (patchGroupPivot && worldPhysics.getPhase() === 'idle') {
      this.groupPivot.removeFromParent();
      if (mode !== 'translate' && mode !== 'rotate' && mode !== 'scale') {
        gizmo.setEnabled(false);
        return;
      }
      gizmo.setTransformMode(mode);
      gizmo.attach(patchGroupPivot);
      gizmo.setEnabled(true);
      return;
    }
    const activePatchHandle = patchGizmo.getActiveHandleMesh();
    const group = this.getGroupRuntimes();
    if (group && !selectedLightId && !activePatchHandle && worldPhysics.getPhase() === 'idle') {
      this.attachGroupPivot(group, mode);
      return;
    }
    this.groupPivot.removeFromParent();
    const gizmoTarget =
      activePatchHandle ??
      ((selectedLightId ? lighting.getHelperObject(selectedLightId) : null) ??
      selectedAssetObject);

    const worldPhase = worldPhysics.getPhase();
    const clothSimLocked =
      selectedAsset != null &&
      isFabricClothAssetKind(selectedAsset.entity.assetKind) &&
      (worldPhase === 'simulating' || worldPhase === 'paused');

    if (clothSimLocked) {
      const pinned =
        selectedAsset.entity.fabricClothParams?.sim.pinnedCornersCount ?? 0;
      if (
        mode === 'translate' &&
        pinned > 0 &&
        fabricClothSimulation.hasBinding(selectedAsset.entity.id)
      ) {
        const corner = this.getFabricClothActivePinCorner(selectedAsset.entity.id);
        const activeCorner = Math.min(corner, pinned - 1);
        const pinMesh = fabricClothSimulation.getPinMesh(
          selectedAsset.entity.id,
          activeCorner,
        );
        if (pinMesh) {
          gizmo.setTransformMode('translate');
          gizmo.attach(pinMesh);
          gizmo.setEnabled(true);
          return;
        }
      }
      gizmo.setEnabled(false);
      gizmo.attach(null);
      return;
    }

    if (mode === 'translate') {
      gizmo.setTransformMode('translate');
      gizmo.attach(gizmoTarget);
      gizmo.setEnabled(Boolean(gizmoTarget));
      return;
    }

    if (mode === 'rotate') {
      if (selectedLightId) {
        gizmo.setEnabled(false);
        return;
      }
      gizmo.setTransformMode('rotate');
      gizmo.attach(gizmoTarget);
      gizmo.setEnabled(Boolean(gizmoTarget));
      return;
    }

    if (mode === 'scale') {
      if (
        selectedLightId ||
        !selectedAsset ||
        isWallAssetKind(selectedAsset.entity.assetKind)
      ) {
        gizmo.setEnabled(false);
        return;
      }
      selectedAsset.object.scale.set(1, 1, 1);
      gizmo.setTransformMode('scale');
      gizmo.attach(gizmoTarget);
      gizmo.setEnabled(true);
      return;
    }

    gizmo.setEnabled(false);
  }

  /** Returns true when the corner was accepted and the gizmo re-targeted. */
  setFabricClothActivePinCorner(entityId: string, cornerIndex: number): boolean {
    const runtime = this.deps.registry.getRuntime(entityId);
    if (!runtime || !isFabricClothAssetKind(runtime.entity.assetKind)) {return false;}
    const count =
      runtime.entity.fabricClothParams?.sim.pinnedCornersCount ?? 0;
    if (count <= 0) {return false;}
    const clamped = Math.max(0, Math.min(MAX_PIN_CORNER_INDEX, Math.floor(cornerIndex)));
    if (clamped >= count) {return false;}
    this.fabricClothActivePinCorner.set(entityId, clamped);
    this.refresh();
    return true;
  }

  getFabricClothActivePinCorner(entityId: string): number {
    return this.fabricClothActivePinCorner.get(entityId) ?? 0;
  }

  clampFabricClothActivePinForEntity(entityId: string): void {
    const runtime = this.deps.registry.getRuntime(entityId);
    if (!runtime || !isFabricClothAssetKind(runtime.entity.assetKind)) {return;}
    const count =
      runtime.entity.fabricClothParams?.sim.pinnedCornersCount ?? 0;
    if (count <= 0) {
      this.fabricClothActivePinCorner.delete(entityId);
      return;
    }
    const current = this.getFabricClothActivePinCorner(entityId);
    this.fabricClothActivePinCorner.set(
      entityId,
      Math.min(current, count - 1),
    );
  }

  /** Group panel values; null unless two or more visible assets are selected. */
  getGroupState(): SelectionGroupState | null {
    const group = this.getGroupRuntimes();
    if (!group) {return null;}
    this.syncGroupKey(group);
    const center = groupCenter(group.map((runtime) => runtime.object));
    const parent = group[0].object.parent;
    if (!center || !parent) {return null;}
    const local = parent.worldToLocal(center.clone());
    const euler = new Euler().setFromQuaternion(this.groupQuaternion);
    return {
      center: { x: local.x, y: local.y, z: local.z },
      rotation: { x: euler.x, y: euler.y, z: euler.z },
      scale: this.groupScale,
    };
  }

  /** Moves the whole group so its centre lands on `center`. */
  setGroupCenter(center: { x: number; y: number; z: number }): void {
    const state = this.getGroupState();
    if (!state) {return;}
    const delta = new Vector3(center.x - state.center.x, center.y - state.center.y, center.z - state.center.z);
    this.applyGroupEdit((members) =>
      members.map((member) => ({ id: member.id, position: member.position.clone().add(delta), quaternion: member.quaternion.clone() })));
  }

  /** Turns the group about its centre to the relative rotation `rotation` (radians, XYZ). */
  setGroupRotation(rotation: { x: number; y: number; z: number }): void {
    const state = this.getGroupState();
    if (!state) {return;}
    const target = new Quaternion().setFromEuler(new Euler(rotation.x, rotation.y, rotation.z));
    const delta = target.clone().multiply(this.groupQuaternion.clone().invert());
    const pivot = new Vector3(state.center.x, state.center.y, state.center.z);
    this.applyGroupEdit((members) => applyGroupRigidDelta(members, pivot, new Quaternion(), pivot, delta));
    this.groupQuaternion.copy(target);
  }

  /** Scales the group about its centre to the relative uniform scale `scale`. */
  setGroupScale(scale: number): void {
    const state = this.getGroupState();
    if (!state || scale <= 0) {return;}
    const factor = clampSizeScale(scale / this.groupScale);
    const pivot = new Vector3(state.center.x, state.center.y, state.center.z);
    const sizes = new Map((this.getGroupRuntimes() ?? []).map((runtime) => [runtime.entity.id, runtime.entity.sizeScale]));
    this.applyGroupEdit((members) => applyGroupScale(members, pivot, factor));
    for (const runtime of this.getGroupRuntimes() ?? []) {
      if (!isWallAssetKind(runtime.entity.assetKind)) {
        this.commitUniformScale(runtime.entity, factor, sizes.get(runtime.entity.id) ?? runtime.entity.sizeScale);
      }
    }
    this.groupScale *= factor;
  }

  private applyGroupEdit(edit: (members: GroupMemberStart[]) => GroupMemberPose[]): void {
    const members = (this.getGroupRuntimes() ?? []).map((runtime) => ({
      id: runtime.entity.id,
      position: runtime.object.position.clone(),
      quaternion: runtime.object.quaternion.clone(),
    }));
    this.applyPoses(edit(members));
    this.refresh();
  }

  private applyPoses(poses: readonly GroupMemberPose[]): void {
    const { registry } = this.deps;
    for (const pose of poses) {
      const runtime = registry.getRuntime(pose.id);
      if (!runtime) {continue;}
      runtime.object.position.copy(pose.position);
      runtime.object.quaternion.copy(pose.quaternion);
      runtime.object.updateMatrixWorld();
      registry.syncTransformFromObject(pose.id);
      this.deps.syncFixedRigidPose(pose.id);
    }
    this.deps.patchGizmo.syncHelpersFromEntity();
    this.deps.emit();
  }

  /** A new set of selected assets starts again at 0° / 100 %. */
  private syncGroupKey(group: readonly { entity: AssetEntity }[]): void {
    const key = group.map((runtime) => runtime.entity.id).sort().join('|');
    if (key === this.groupKey) {return;}
    this.groupKey = key;
    this.groupQuaternion.identity();
    this.groupScale = 1;
  }

  /** Visible selected assets when more than one is selected, else null. */
  private getGroupRuntimes(): { entity: AssetEntity; object: Object3D }[] | null {
    const { registry } = this.deps;
    const runtimes = registry.getSelectedEntityIds()
      .flatMap((id) => {
        const runtime = registry.getRuntime(id);
        return runtime?.entity.visible ? [runtime] : [];
      });
    return runtimes.length > 1 ? runtimes : null;
  }

  private attachGroupPivot(group: { object: Object3D }[], mode: AppMode): void {
    const { gizmo } = this.deps;
    const parent = group[0].object.parent;
    const center = groupCenter(group.map((runtime) => runtime.object));
    if (!parent || !center || (mode !== 'translate' && mode !== 'rotate' && mode !== 'scale')) {
      gizmo.setEnabled(false);
      return;
    }
    if (this.groupPivot.parent !== parent) {parent.add(this.groupPivot);}
    if (!this.groupDrag) {
      this.groupPivot.position.copy(parent.worldToLocal(center));
      this.groupPivot.quaternion.identity();
      this.groupPivot.scale.set(1, 1, 1);
      this.groupPivot.updateMatrixWorld();
    }
    gizmo.setTransformMode(mode);
    gizmo.attach(this.groupPivot);
    gizmo.setEnabled(true);
  }

  private onGroupTransform(): void {
    const drag = this.groupDrag;
    if (!drag) {return;}
    const { gizmo, registry } = this.deps;
    const pivot = this.groupPivot;
    let poses: GroupMemberPose[];
    if (this.deps.getMode() === 'scale') {
      gizmo.enforceUniformScale();
      const factor = clampSizeScale(pivot.scale.x);
      poses = applyGroupScale(drag.members, drag.pivot, factor);
      for (const member of drag.members) {
        const runtime = registry.getRuntime(member.id);
        if (runtime && !isWallAssetKind(runtime.entity.assetKind)) {runtime.object.scale.setScalar(factor);}
      }
      this.scaleCommitPending = true;
    } else {
      poses = applyGroupRigidDelta(drag.members, drag.pivot, drag.quaternion, pivot.position, pivot.quaternion);
    }
    this.applyPoses(poses);
  }

  private onGroupDraggingChanged(dragging: boolean): void {
    const { registry } = this.deps;
    if (dragging) {
      const members = (this.getGroupRuntimes() ?? []).map((runtime) => ({
        id: runtime.entity.id,
        position: runtime.object.position.clone(),
        quaternion: runtime.object.quaternion.clone(),
        sizeScale: runtime.entity.sizeScale,
      }));
      this.groupDrag = {
        members,
        pivot: this.groupPivot.position.clone(),
        quaternion: this.groupPivot.quaternion.clone(),
      };
      this.scaleCommitPending = false;
      return;
    }
    const drag = this.groupDrag;
    this.groupDrag = null;
    if (drag && this.deps.getMode() === 'rotate') {
      const delta = this.groupPivot.quaternion.clone().multiply(drag.quaternion.clone().invert());
      this.groupQuaternion.premultiply(delta);
    }
    if (drag && this.deps.getMode() === 'scale' && this.scaleCommitPending) {
      const factor = clampSizeScale(this.groupPivot.scale.x);
      this.groupScale *= factor;
      for (const member of drag.members) {
        const runtime = registry.getRuntime(member.id);
        if (!runtime) {continue;}
        runtime.object.scale.set(1, 1, 1);
        if (!isWallAssetKind(runtime.entity.assetKind)) {
          this.commitUniformScale(runtime.entity, factor, member.sizeScale);
        }
      }
      this.scaleCommitPending = false;
    }
    this.refresh();
  }

  /** Bakes a finished uniform scale drag into the entity (kind-specific). */
  private commitUniformScale(entity: AssetEntity, uniform: number, baseSizeScale: number): void {
    const { assets } = this.deps;
    const entityId = entity.id;
    const patchParams = entity.patchParams;
    if (patchParams && isPatchAssetKind(entity.assetKind)) {
      // Patches bake the scale into their points (around the pivot, which sits at the center).
      const points = scalePatchPoints(patchParams, clampSizeScale(uniform));
      this.deps.applyAssetMutation(
        () => assets.setKindParams('patch', entityId, { points }),
        { refreshGizmo: true },
      );
    } else if (bakesUniformScaleIntoParams(entity.assetKind)) {
      this.deps.applyAssetMutation(
        () => assets.applyRigidPrimitiveUniformScale(entityId, uniform),
        { refreshGizmo: true },
      );
    } else {
      const nextScale = clampSizeScale(baseSizeScale * uniform);
      this.deps.applyAssetMutation(() =>
        assets.setAssetSizeScale(entityId, nextScale),
      );
    }
  }

  private onTransform(): void {
    const { gizmo, lighting, patchGizmo, registry } = this.deps;
    if (gizmo.getAttachedObject() === this.groupPivot) {
      this.onGroupTransform();
      return;
    }
    if (gizmo.getAttachedObject() === patchGizmo.getGroupPivot()) {
      if (this.deps.getMode() === 'scale') {gizmo.enforceUniformScale();}
      patchGizmo.updateGroupDrag();
      this.deps.emit();
      this.deps.viewportInvalidation.invalidate();
      return;
    }
    const selectedLightId = lighting.getSelectedLightId();
    if (selectedLightId) {
      lighting.syncOffsetFromHelper(selectedLightId);
      lighting.updateFrame();
      this.deps.emit();
      return;
    }

    const attached = gizmo.getAttachedObject();
    if (attached && this.handleFabricClothPinTransform(attached)) {
      return;
    }

    if (patchGizmo.getActiveTarget()) {
      const mode = this.deps.getMode() === 'rotate' ? 'rotate' : 'translate';
      const handled = patchGizmo.applyHandleTransform(mode);
      if (handled) {
        this.deps.emit();
        this.deps.viewportInvalidation.invalidate();
        return;
      }
    }

    const selected = registry.getSelectedRuntime();
    if (!selected) {return;}

    if (this.deps.getMode() === 'scale') {
      gizmo.enforceUniformScale();
      this.scaleCommitPending = true;
      return;
    }

    registry.syncTransformFromObject(selected.entity.id);
    this.deps.syncFixedRigidPose(selected.entity.id);
    patchGizmo.syncHelpersFromEntity();
    this.deps.emit();
  }

  private onDraggingChanged(dragging: boolean): void {
    const { cameras, viewportInvalidation, registry } = this.deps;
    cameras.setOrbitEnabled(!dragging);
    viewportInvalidation.setContinuous(dragging || cameras.isInteracting());
    if (dragging) {this.maybeDuplicateForAltDrag();}

    if (this.deps.gizmo.getAttachedObject() === this.groupPivot) {
      this.onGroupDraggingChanged(dragging);
      return;
    }

    const { patchGizmo } = this.deps;
    if (this.deps.gizmo.getAttachedObject() === patchGizmo.getGroupPivot()) {
      if (dragging) {
        patchGizmo.beginGroupDrag();
        return;
      }
      patchGizmo.endGroupDrag();
      const entityId = patchGizmo.getActiveEntityId();
      if (entityId) {this.deps.onPatchPointDragEnd(entityId);}
      this.refresh();
      return;
    }

    const patchEntityId = patchGizmo.getActiveTarget()?.entityId;
    if (!dragging && patchEntityId && this.deps.getMode() !== 'scale') {
      this.deps.onPatchPointDragEnd(patchEntityId);
      return;
    }

    if (this.deps.getMode() !== 'scale') {return;}

    const selected = registry.getSelectedRuntime();
    if (!selected) {return;}

    if (dragging) {
      this.scaleDragBase = selected.entity.sizeScale;
      selected.object.scale.set(1, 1, 1);
      this.scaleCommitPending = false;
      return;
    }

    if (!this.scaleCommitPending) {return;}

    const uniform =
      (selected.object.scale.x + selected.object.scale.y + selected.object.scale.z) / 3;
    selected.object.scale.set(1, 1, 1);
    this.commitUniformScale(selected.entity, uniform, this.scaleDragBase);
    this.scaleCommitPending = false;
  }

  private handleFabricClothPinTransform(attached: Object3D): boolean {
    const entityId = fabricClothPinEntityId(attached);
    const cornerIndex = fabricClothPinCornerIndex(attached);
    if (entityId === null || cornerIndex === null) {return false;}

    const phase = this.deps.worldPhysics.getPhase();
    if (phase === 'simulating') {
      this.deps.fabricClothSimulation.applyPinDrag(entityId, cornerIndex, attached);
    } else if (phase === 'paused') {
      this.deps.fabricClothSimulation.previewPinDragWhenPaused(
        entityId,
        cornerIndex,
        attached,
      );
    } else {
      return false;
    }
    this.deps.viewportInvalidation.invalidate();
    return true;
  }
}
