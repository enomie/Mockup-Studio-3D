import type { Object3D } from 'three/webgpu';
import type { AppMode } from '@/scene/scene-api';
import { isFabricClothAssetKind } from '@/scene/asset-fabric-cloth';
import { isRigidPrimitiveAssetKind } from '@/scene/rigid-primitive-asset';
import { isWallAssetKind } from '@/scene/asset-wall';
import { clampSizeScale } from '@/scene/asset-sizing';
import type { AssetSystem } from './asset-system';
import type { CameraController } from './camera-controller';
import type { EntityRegistry } from './entity-registry';
import type { FabricClothSimulationParticipant } from './fabric-cloth-simulation-participant';
import { fabricClothPinCornerIndex, fabricClothPinEntityId } from './fabric-cloth-pins';
import type { GizmoController } from './gizmo-controller';
import type { LightingSystem } from './lighting/lighting-system';
import type { TrianglePatchGizmoController } from './triangle-patch-gizmo-controller';
import type { ViewportInvalidation } from './viewport-invalidation';
import type { WorldPhysicsSessionController } from './world-physics-session';

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
  emit: () => void;
  syncFixedRigidPose: (entityId: string) => void;
  applyAssetMutation: (
    mutation: () => void | Promise<void>,
    options?: { refreshGizmo?: boolean },
  ) => void;
}

/**
 * Owns what the transform gizmo is attached to and turns gizmo drags into
 * edits of lights, patch handles, cloth pins and entity transforms or scale.
 */
export class GizmoInteractionController {
  private scaleDragBase = 1;
  private scaleCommitPending = false;
  private readonly fabricClothActivePinCorner = new Map<string, number>();

  constructor(private readonly deps: GizmoInteractionDeps) {
    deps.gizmo.setCallbacks({
      onTransform: () => { this.onTransform(); },
      onDraggingChanged: (dragging) => { this.onDraggingChanged(dragging); },
    });
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
    const activePatchHandle = patchGizmo.getActiveHandleMesh();
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

  private onTransform(): void {
    const { gizmo, lighting, patchGizmo, registry } = this.deps;
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
    this.deps.emit();
  }

  private onDraggingChanged(dragging: boolean): void {
    const { cameras, viewportInvalidation, registry, assets } = this.deps;
    cameras.setOrbitEnabled(!dragging);
    viewportInvalidation.setContinuous(dragging || cameras.isInteracting());

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
    const entityId = selected.entity.id;
    if (isRigidPrimitiveAssetKind(selected.entity.assetKind)) {
      this.deps.applyAssetMutation(
        () => assets.applyRigidPrimitiveUniformScale(entityId, uniform),
        { refreshGizmo: true },
      );
    } else {
      const nextScale = clampSizeScale(this.scaleDragBase * uniform);
      this.deps.applyAssetMutation(() =>
        assets.setAssetSizeScale(entityId, nextScale),
      );
    }
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
