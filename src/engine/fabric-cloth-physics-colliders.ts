import { isFabricClothAssetKind } from '@/scene/asset-fabric-cloth';
import { resolveFabricDrape } from '@/physics/fabric-cloth-drape';
import {
  fabricClothMeshSyncFlagsForSimulationFrame,
  maxFabricClothRestPoseWorldError,
  prepareFabricClothSimSession,
  restoreFabricClothRestPositions,
  syncFabricClothMeshFromSoftBody,
  type FabricClothSimSession,
} from '@/physics/fabric-cloth-soft-body';
import type { PhysicsWorld } from '@/physics/physics-world';
import type RAPIER from '@dimforge/rapier3d-simd-compat';
import { Mesh, type Object3D } from 'three/webgpu';
import type { EntityRegistry } from './entity-registry';

function fabricClothSoftBodyId(entityId: string): string {
  return `fabric-soft:${entityId}`;
}

interface FabricClothBinding {
  softBody: RAPIER.SoftBody;
  clothMesh: Mesh;
  session: FabricClothSimSession;
  /** Incremented each physics tick sync; drives normals/bounds stride. */
  syncFrameIndex: number;
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

/** Rapier soft-body cloth during world physics session. */
export class FabricClothPhysicsColliders {
  private readonly bindings = new Map<string, FabricClothBinding>();

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly registry: EntityRegistry,
  ) {}

  spawnSessionDynamics(): void {
    this.clearSessionDynamics();
    for (const entity of this.registry.getEntities()) {
      if (!isFabricClothAssetKind(entity.assetKind)) {continue;}
      this.spawnOne(entity.id);
    }
  }

  spawnOne(entityId: string): void {
    const runtime = this.registry.getRuntime(entityId);
    if (!runtime || !isFabricClothAssetKind(runtime.entity.assetKind)) {return;}

    const clothMesh = findFabricClothMesh(runtime.object);
    if (!clothMesh) {return;}

    runtime.object.updateWorldMatrix(true, true);
    const materialId = runtime.entity.materials?.fabricClothMaterialId ?? 'material-silk';
    const drape = resolveFabricDrape(materialId);
    const { session, desc } = prepareFabricClothSimSession(clothMesh, drape);
    const softBody = this.physics.createSoftBody(fabricClothSoftBodyId(entityId), desc);

    const restPoseErr = maxFabricClothRestPoseWorldError(softBody, clothMesh, session);
    const REST_POSE_MAX_ERR_M = 1e-3;
    if (restPoseErr > REST_POSE_MAX_ERR_M) {
      console.error(
        `[fabric-cloth] Rapier rest pose mismatch (${restPoseErr.toFixed(4)} m) for entity ${entityId}`,
      );
      this.physics.removeSoftBody(fabricClothSoftBodyId(entityId));
      return;
    }

    syncFabricClothMeshFromSoftBody(softBody, clothMesh, session);
    this.bindings.set(entityId, { softBody, clothMesh, session, syncFrameIndex: 0 });
  }

  hasBinding(entityId: string): boolean {
    return this.bindings.has(entityId);
  }

  removeOne(entityId: string): void {
    const binding = this.bindings.get(entityId);
    if (!binding) {return;}
    restoreFabricClothRestPositions(binding.clothMesh, binding.session.restPositions);
    this.physics.removeSoftBody(fabricClothSoftBodyId(entityId));
    this.bindings.delete(entityId);
  }

  clearSessionDynamics(): void {
    for (const entityId of [...this.bindings.keys()]) {
      this.removeOne(entityId);
    }
  }

  refreshOne(entityId: string): void {
    if (!this.bindings.has(entityId)) {return;}
    this.removeOne(entityId);
    this.spawnOne(entityId);
  }

  setAllSleeping(sleeping: boolean): void {
    for (const binding of this.bindings.values()) {
      binding.softBody.setEnabled(!sleeping);
    }
  }

  syncEntityTransformsFromPhysics(): void {
    for (const binding of this.bindings.values()) {
      binding.syncFrameIndex += 1;
      const flags = fabricClothMeshSyncFlagsForSimulationFrame(binding.syncFrameIndex);
      syncFabricClothMeshFromSoftBody(
        binding.softBody,
        binding.clothMesh,
        binding.session,
        flags,
      );
    }
  }

  dispose(): void {
    this.clearSessionDynamics();
  }
}
