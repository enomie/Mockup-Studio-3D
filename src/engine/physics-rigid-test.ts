import { BoxGeometry, Euler, Mesh, Quaternion, type Scene } from 'three/webgpu';
import type { MaterialResolver } from './material-resolver';
import type { CameraController } from './camera-controller';
import { syncPhysicsBinding, type PhysicsBinding } from './physics-sync';
import { inflateHalfExtentsForPhysics } from '@/physics/collider-margin';
import { RIGID_DYNAMIC_FRICTION, RIGID_DYNAMIC_RESTITUTION } from '@/physics/constants';
import type { PhysicsWorld } from '@/physics/physics-world';
import type { Quat } from '@/physics/types';
import type { PhysicsRigidTestPhase } from '@/scene/physics-settings';
import { MATERIAL_PAPER_ID } from '@/scene/material-ids';
import { applyFullShadowFlags } from '@/render/shadow-setup';
import type { Vec3 } from '@/scene/entity-types';

const _spawnEuler = new Euler();
const _spawnQuat = new Quaternion();

/** ID prefix for rigid-test bodies — not AssetEntities; never serialize in SceneSnapshot. */
export const PHYSICS_RIGID_TEST_ID_PREFIX = 'physics-rigid-test';

export const RIGID_TEST_EDGE_M = 0.1;
export const RIGID_TEST_HALF_M = RIGID_TEST_EDGE_M / 2;
/** Bottom of cube at this height above ground (y = 0). */
export const RIGID_TEST_BOTTOM_Y_M = 3;
export const RIGID_TEST_MASS_KG = 1;
export const RIGID_TEST_DYNAMIC_FRICTION = RIGID_DYNAMIC_FRICTION;

interface RigidTestInstance {
  binding: PhysicsBinding;
  mesh: Mesh;
}

export function rigidTestSpawnCenterY(): number {
  return RIGID_TEST_BOTTOM_Y_M + RIGID_TEST_HALF_M;
}

export function rigidTestSpawnPosition(target: Vec3): Vec3 {
  return {
    x: target.x,
    y: rigidTestSpawnCenterY(),
    z: target.z,
  };
}

/** Uniform random orientation for each Start. */
export function rigidTestRandomSpawnRotation(): Quat {
  _spawnEuler.set(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
  );
  _spawnQuat.setFromEuler(_spawnEuler);
  return { x: _spawnQuat.x, y: _spawnQuat.y, z: _spawnQuat.z, w: _spawnQuat.w };
}

export class PhysicsRigidTestController {
  private instances: RigidTestInstance[] = [];
  private nextInstanceSerial = 1;
  private exportHideDepth = 0;

  constructor(
    private readonly scene: Scene,
    private readonly physics: PhysicsWorld,
    private readonly cameras: CameraController,
    private readonly materialResolver: MaterialResolver,
  ) {}

  getPhase(): PhysicsRigidTestPhase {
    return this.instances.length > 0 ? 'running' : 'idle';
  }

  getActiveBindings(): readonly PhysicsBinding[] {
    return this.instances.map((entry) => entry.binding);
  }

  start(): void {
    const bodyId = `${PHYSICS_RIGID_TEST_ID_PREFIX}-${this.nextInstanceSerial}`;
    this.nextInstanceSerial += 1;

    const spawn = rigidTestSpawnPosition(this.cameras.getViewState().target);
    const rotation = rigidTestRandomSpawnRotation();
    const colliderHalf = inflateHalfExtentsForPhysics({
      x: RIGID_TEST_HALF_M,
      y: RIGID_TEST_HALF_M,
      z: RIGID_TEST_HALF_M,
    });
    const body = this.physics.createDynamicBox(
      bodyId,
      colliderHalf,
      spawn,
      {
        massKg: RIGID_TEST_MASS_KG,
        friction: RIGID_TEST_DYNAMIC_FRICTION,
        restitution: RIGID_DYNAMIC_RESTITUTION,
        rotation,
      },
    );

    const material = this.materialResolver.create(MATERIAL_PAPER_ID);
    if (!material) {
      this.physics.removeBody(bodyId);
      return;
    }

    const mesh = new Mesh(
      new BoxGeometry(RIGID_TEST_EDGE_M, RIGID_TEST_EDGE_M, RIGID_TEST_EDGE_M),
      material,
    );
    applyFullShadowFlags(mesh);
    mesh.userData.physicsRigidTest = true;

    const binding: PhysicsBinding = { body, object: mesh };
    syncPhysicsBinding(binding);
    this.scene.add(mesh);

    this.instances.push({ binding, mesh });
  }

  stop(): void {
    if (this.instances.length === 0) {return;}
    this.clearAllInstances();
  }

  pushExportHide(): void {
    if (this.instances.length === 0) {return;}
    if (this.exportHideDepth === 0) {
      for (const entry of this.instances) {
        entry.mesh.visible = false;
      }
    }
    this.exportHideDepth += 1;
  }

  popExportHide(): void {
    if (this.instances.length === 0 || this.exportHideDepth === 0) {return;}
    this.exportHideDepth -= 1;
    if (this.exportHideDepth === 0) {
      for (const entry of this.instances) {
        entry.mesh.visible = true;
      }
    }
  }

  dispose(): void {
    this.clearAllInstances();
  }

  private clearAllInstances(): void {
    for (const entry of this.instances) {
      this.physics.removeBody(entry.binding.body.id);
      this.scene.remove(entry.mesh);
      entry.mesh.geometry.dispose();
    }
    this.instances = [];
  }
}
