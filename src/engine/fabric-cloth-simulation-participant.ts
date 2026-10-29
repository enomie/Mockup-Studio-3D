import {
  defaultFabricClothParams,
  isFabricClothAssetKind,
  type FabricClothSimParams,
} from '@/scene/asset-fabric-cloth';
import { buildSceneColliderSnapshot } from '@/physics/cloth/build-scene-collider-snapshot';
import type { EntityRegistry } from './entity-registry';
import { FabricClothPinSet } from './fabric-cloth-pins';
import {
  applyPinWorldPositionsToBinding,
  buildPinCornersEntityLocal,
  createFabricClothVerletBinding,
  flushBindingPlane,
  pinPositionsWorldFromEntity,
  restoreFabricClothVerletMesh,
  setCornerWorldPosition,
  stepFabricClothVerletBinding,
  wakeFabricClothVerletBinding,
  type FabricClothVerletBinding,
} from './fabric-cloth-verlet-session';
import { Mesh, type Object3D, type Scene } from 'three/webgpu';

interface SessionEntry {
  binding: FabricClothVerletBinding;
  pinSet: FabricClothPinSet;
}

function findFabricClothMesh(root: Object3D): Mesh | null {
  let found: Mesh | null = null;
  root.traverse((child) => {
    if (found) {return;}
    if (child instanceof Mesh && child.userData.assetMeshRole === 'fabricCloth') {
      found = child;
    }
  });
  return found;
}

/** CPU Verlet fabric cloth during world physics session (replaces Rapier SoftBody). */
export class FabricClothSimulationParticipant {
  private readonly entries = new Map<string, SessionEntry>();

  constructor(
    private readonly registry: EntityRegistry,
    private readonly scene: Scene,
  ) {}

  spawnSessionDynamics(): void {
    this.clearSessionDynamics();
    for (const entity of this.registry.getEntities()) {
      if (!entity.visible || !isFabricClothAssetKind(entity.assetKind)) {continue;}
      this.spawnOne(entity.id);
    }
  }

  spawnOne(entityId: string): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isFabricClothAssetKind(runtime.entity.assetKind)) {return;}

    const clothMesh = findFabricClothMesh(runtime.object);
    if (!clothMesh) {return;}

    const binding = createFabricClothVerletBinding(
      clothMesh,
      runtime.entity,
      runtime.object,
    );
    const pinSet = new FabricClothPinSet(this.scene, entityId);
    const sim = runtime.entity.fabricClothParams?.sim ?? defaultFabricClothParams().sim;
    this.syncPinsAfterSimChange(entityId, binding, pinSet, runtime.object, sim, 0);
    this.entries.set(entityId, { binding, pinSet });
  }

  hasBinding(entityId: string): boolean {
    return this.entries.has(entityId);
  }

  getClothMeshForBake(entityId: string): Mesh | null {
    return this.entries.get(entityId)?.binding.clothMesh ?? null;
  }

  /** Flushes the cloth plane from Verlet state and returns the binding for bake. */
  getBindingForBake(entityId: string): FabricClothVerletBinding | null {
    const entry = this.entries.get(entityId);
    if (!entry) {
      return null;
    }
    flushBindingPlane(entry.binding);
    return entry.binding;
  }

  getPinMesh(entityId: string, cornerIndex: number): Mesh | undefined {
    return this.entries.get(entityId)?.pinSet.getPinMesh(cornerIndex);
  }

  removeOne(entityId: string): void {
    const entry = this.entries.get(entityId);
    if (!entry) {return;}
    restoreFabricClothVerletMesh(entry.binding);
    entry.pinSet.dispose();
    this.entries.delete(entityId);
  }

  clearSessionDynamics(): void {
    for (const entityId of [...this.entries.keys()]) {
      this.removeOne(entityId);
    }
  }

  refreshOne(entityId: string): void {
    if (!this.entries.has(entityId)) {return;}
    this.removeOne(entityId);
    this.spawnOne(entityId);
  }

  setAllSleeping(_sleeping: boolean): void {
    // Pause stops WorldPhysicsSession.tick; no Rapier soft body to disable.
  }

  wakeSimulation(entityId: string): void {
    const entry = this.entries.get(entityId);
    if (!entry) {return;}
    wakeFabricClothVerletBinding(entry.binding);
  }

  applyPinDrag(entityId: string, cornerIndex: number, pinObject: Object3D): void {
    const entry = this.entries.get(entityId);
    const runtime = this.registry.getRuntime(entityId);
    if (!entry || !runtime) {return;}

    setCornerWorldPosition(
      entry.binding,
      cornerIndex,
      pinObject.position.x,
      pinObject.position.y,
      pinObject.position.z,
      true,
    );
    entry.pinSet.syncFromWorldCenterline(
      entry.binding.cornerIndexMap,
      entry.binding.pos,
    );

    const pinCorners = buildPinCornersEntityLocal(
      runtime.object,
      entry.pinSet.getPinWorldPositions(),
      runtime.entity.fabricClothParams?.sim.pinCorners ??
        defaultFabricClothParams().sim.pinCorners,
    );
    const currentSim =
      runtime.entity.fabricClothParams?.sim ?? defaultFabricClothParams().sim;
    this.registry.setFabricClothParams(entityId, {
      sim: { ...currentSim, pinCorners },
    });
  }

  previewPinDragWhenPaused(entityId: string, cornerIndex: number, pinObject: Object3D): void {
    this.applyPinDrag(entityId, cornerIndex, pinObject);
  }

  onSimPinsChanged(
    entityId: string,
    prevCount: number,
    nextSim: FabricClothSimParams,
  ): void {
    const entry = this.entries.get(entityId);
    const runtime = this.registry.getRuntime(entityId);
    if (!entry || !runtime) {return;}

    const { binding, pinSet } = entry;
    const nextCount = nextSim.pinnedCornersCount;

    if (nextCount > prevCount) {
      pinSet.snapPinsToClothCorners(
        binding.cornerIndexMap,
        binding.pos,
        nextCount,
        prevCount,
        binding.oldPos,
      );
      const pinCorners = buildPinCornersEntityLocal(
        runtime.object,
        pinSet.getPinWorldPositions(),
        nextSim.pinCorners,
      );
      const currentSim =
        runtime.entity.fabricClothParams?.sim ?? defaultFabricClothParams().sim;
      this.registry.setFabricClothParams(entityId, {
        sim: { ...currentSim, pinCorners },
      });
      applyPinWorldPositionsToBinding(
        binding,
        nextCount,
        pinPositionsWorldFromEntity(runtime.object, {
          ...nextSim,
          pinCorners,
        }),
      );
    } else if (nextCount < prevCount) {
      applyPinWorldPositionsToBinding(
        binding,
        nextCount,
        pinPositionsWorldFromEntity(runtime.object, nextSim),
      );
    }

    this.syncPinsAfterSimChange(
      entityId,
      binding,
      pinSet,
      runtime.object,
      nextSim,
      prevCount,
    );
  }

  private syncPinsAfterSimChange(
    _entityId: string,
    binding: FabricClothVerletBinding,
    pinSet: FabricClothPinSet,
    entityRoot: Object3D,
    sim: FabricClothSimParams,
    _prevCount: number,
  ): void {
    pinSet.applyVisibility(sim.pinnedCornersCount, true);
    pinSet.syncFromWorldCenterline(binding.cornerIndexMap, binding.pos);
    applyPinWorldPositionsToBinding(
      binding,
      sim.pinnedCornersCount,
      pinPositionsWorldFromEntity(entityRoot, sim),
    );
    flushBindingPlane(binding);
  }

  syncEntityTransformsFromPhysics(): void {
    const snapshot = buildSceneColliderSnapshot(this.registry, {
      worldSessionActive: true,
    });

    for (const [entityId, entry] of this.entries) {
      const runtime = this.registry.getRuntime(entityId);
      if (!runtime) {continue;}
      stepFabricClothVerletBinding(
        entry.binding,
        runtime.entity,
        runtime.object,
        snapshot,
      );
      entry.pinSet.syncFromWorldCenterline(
        entry.binding.cornerIndexMap,
        entry.binding.pos,
      );
    }
  }

  dispose(): void {
    this.clearSessionDynamics();
  }
}
