import RAPIER from '@dimforge/rapier3d-simd-compat';
import {
  FIXED_TIMESTEP,
  GRAVITY,
  GROUND_COLLIDER_FRICTION,
  GROUND_COLLIDER_RESTITUTION,
  GROUND_HALF_THICKNESS,
  PHYSICS_DYNAMIC_ANGULAR_DAMPING,
  PHYSICS_DYNAMIC_LINEAR_DAMPING,
  RIGID_DYNAMIC_FRICTION,
  RIGID_DYNAMIC_RESTITUTION,
} from './constants';
import { PhysicsBody } from './physics-body';
import {
  rigidColliderToRapierDesc,
  type RigidColliderShape,
} from './rigid-collider-desc';
import { ensureRapierInit } from './rapier-init';
import {
  clampGravityScale,
  DEFAULT_GRAVITY_SCALE,
  gravityVectorFromScale,
} from '@/scene/physics-settings';
import type { HalfExtents, PhysicsTransform, Quat, Vec3 } from './types';

export interface DynamicBoxOptions {
  massKg: number;
  friction?: number;
  restitution?: number;
  rotation?: Quat;
  /** Local collider translation on the rigid body (meters). */
  colliderOffset?: Vec3;
}

export interface DynamicRigidColliderOptions {
  massKg: number;
  friction?: number;
  restitution?: number;
}

export interface ManagedSoftBody {
  handle: number;
  body: RAPIER.SoftBody;
}

export class PhysicsWorld {
  private readonly world: RAPIER.World;
  private readonly bodies = new Map<string, PhysicsBody>();
  private readonly dynamicBodies: PhysicsBody[] = [];
  private readonly softBodies = new Map<string, ManagedSoftBody>();
  private gravityScale = DEFAULT_GRAVITY_SCALE;
  private accumulator = 0;
  private disposed = false;

  private constructor(world: RAPIER.World) {
    this.world = world;
    world.integrationParameters.dt = FIXED_TIMESTEP;
  }

  static async create(): Promise<PhysicsWorld> {
    await ensureRapierInit();
    return new PhysicsWorld(new RAPIER.World(GRAVITY));
  }

  step(deltaSeconds: number): void {
    this.accumulator += deltaSeconds;
    while (this.accumulator >= FIXED_TIMESTEP) {
      this.world.step();
      this.accumulator -= FIXED_TIMESTEP;
    }
  }

  createStaticGround(id: string, halfExtent: number): PhysicsBody {
    const rigidBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, -GROUND_HALF_THICKNESS, 0),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfExtent, GROUND_HALF_THICKNESS, halfExtent)
        .setFriction(GROUND_COLLIDER_FRICTION)
        .setRestitution(GROUND_COLLIDER_RESTITUTION),
      rigidBody,
    );
    return this.registerBody(id, rigidBody, false);
  }

  createFixedRigidCollider(
    id: string,
    shape: RigidColliderShape,
    pose: PhysicsTransform,
  ): PhysicsBody {
    this.removeBody(id);

    const rigidBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(pose.position.x, pose.position.y, pose.position.z)
        .setRotation(pose.rotation),
    );

    const colliderDesc = rigidColliderToRapierDesc(shape)
      .setFriction(RIGID_DYNAMIC_FRICTION)
      .setRestitution(RIGID_DYNAMIC_RESTITUTION);
    this.world.createCollider(colliderDesc, rigidBody);

    return this.registerBody(id, rigidBody, false);
  }

  createDynamicRigidCollider(
    id: string,
    shape: RigidColliderShape,
    pose: PhysicsTransform,
    options: DynamicRigidColliderOptions,
  ): PhysicsBody {
    this.removeBody(id);

    const friction = options.friction ?? RIGID_DYNAMIC_FRICTION;
    const restitution = options.restitution ?? RIGID_DYNAMIC_RESTITUTION;

    const rigidBody = this.createDynamicRigidBody(pose);

    const colliderDesc = rigidColliderToRapierDesc(shape)
      .setFriction(friction)
      .setRestitution(restitution)
      .setMass(options.massKg);
    this.world.createCollider(colliderDesc, rigidBody);

    return this.registerBody(id, rigidBody, true);
  }

  setFixedBodyPose(id: string, position: Vec3, rotation: Quat): void {
    const body = this.bodies.get(id);
    if (!body || body.isDynamic) {return;}
    body.setPose(position, rotation);
  }

  removeBody(id: string): void {
    const body = this.bodies.get(id);
    if (!body) {return;}
    body.dispose();
    this.bodies.delete(id);
    const dynamicIndex = this.dynamicBodies.findIndex((entry) => entry.id === id);
    if (dynamicIndex >= 0) {
      this.dynamicBodies.splice(dynamicIndex, 1);
    }
  }

  createDynamicBox(
    id: string,
    halfExtents: HalfExtents,
    position: Vec3,
    options: DynamicBoxOptions,
  ): PhysicsBody {
    this.removeBody(id);

    const friction = options.friction ?? RIGID_DYNAMIC_FRICTION;
    const restitution = options.restitution ?? RIGID_DYNAMIC_RESTITUTION;
    const rotation = options.rotation ?? { x: 0, y: 0, z: 0, w: 1 };
    const colliderOffset = options.colliderOffset ?? { x: 0, y: 0, z: 0 };

    const rigidBody = this.createDynamicRigidBody({ position, rotation });
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      halfExtents.x,
      halfExtents.y,
      halfExtents.z,
    )
      .setTranslation(colliderOffset.x, colliderOffset.y, colliderOffset.z)
      .setRestitution(restitution)
      .setFriction(friction)
      .setMass(options.massKg);
    this.world.createCollider(colliderDesc, rigidBody);
    return this.registerBody(id, rigidBody, true);
  }

  getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }

  getDynamicBodies(): readonly PhysicsBody[] {
    return this.dynamicBodies;
  }

  hasDynamicBodies(): boolean {
    return this.dynamicBodies.length > 0;
  }

  hasSoftBodies(): boolean {
    return this.softBodies.size > 0;
  }

  needsSimulationStep(): boolean {
    return this.hasDynamicBodies() || this.hasSoftBodies();
  }

  createSoftBody(id: string, desc: RAPIER.SoftBodyDesc): RAPIER.SoftBody {
    this.removeSoftBody(id);
    const body = this.world.softBodies.createSoftBody(
      this.world.bodies,
      this.world.colliders,
      desc,
    );
    this.softBodies.set(id, { handle: body.handle, body });
    return body;
  }

  getSoftBody(id: string): RAPIER.SoftBody | undefined {
    return this.softBodies.get(id)?.body;
  }

  removeSoftBody(id: string): void {
    const entry = this.softBodies.get(id);
    if (!entry) {return;}
    this.world.removeSoftBody(entry.body);
    this.softBodies.delete(id);
  }

  getGravityScale(): number {
    return this.gravityScale;
  }

  setGravityScale(scale: number): void {
    this.gravityScale = clampGravityScale(scale);
    this.world.gravity = gravityVectorFromScale(this.gravityScale);
  }

  dispose(): void {
    if (this.disposed) {return;}
    this.disposed = true;

    for (const id of [...this.softBodies.keys()]) {
      this.removeSoftBody(id);
    }
    for (const body of this.bodies.values()) {
      body.dispose();
    }
    this.bodies.clear();
    this.dynamicBodies.length = 0;
    this.world.free();
  }

  /**
   * Sole path for dynamic rigid bodies — block, fabric plane, rigid test (do not spawn elsewhere).
   * CCD stays on for all session dynamics v1 (small test cubes, falling blocks, fabric plane).
   */
  private createDynamicRigidBody(pose: PhysicsTransform): RAPIER.RigidBody {
    return this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pose.position.x, pose.position.y, pose.position.z)
        .setRotation(pose.rotation)
        .setCcdEnabled(true)
        .setLinearDamping(PHYSICS_DYNAMIC_LINEAR_DAMPING)
        .setAngularDamping(PHYSICS_DYNAMIC_ANGULAR_DAMPING),
    );
  }

  private registerBody(
    id: string,
    rigidBody: RAPIER.RigidBody,
    isDynamic: boolean,
  ): PhysicsBody {
    const body = new PhysicsBody(id, this.world, rigidBody);
    this.bodies.set(id, body);
    if (isDynamic) {
      this.dynamicBodies.push(body);
    }
    return body;
  }
}
