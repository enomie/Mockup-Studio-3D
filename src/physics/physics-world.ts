import RAPIER from '@dimforge/rapier3d-simd-compat';
import {
  FIXED_TIMESTEP,
  GRAVITY,
  GROUND_HALF_THICKNESS,
} from './constants';
import { PhysicsBody } from './physics-body';
import { ensureRapierInit } from './rapier-init';
import type { HalfExtents } from './types';

export class PhysicsWorld {
  private readonly world: RAPIER.World;
  private readonly bodies = new Map<string, PhysicsBody>();
  private readonly dynamicBodies: PhysicsBody[] = [];
  private accumulator = 0;
  private disposed = false;

  private constructor(world: RAPIER.World) {
    this.world = world;
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
      RAPIER.ColliderDesc.cuboid(halfExtent, GROUND_HALF_THICKNESS, halfExtent),
      rigidBody,
    );
    return this.registerBody(id, rigidBody, false);
  }

  createDynamicBox(
    id: string,
    halfExtents: HalfExtents,
    spawnCenterY: number,
  ): PhysicsBody {
    const rigidBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, spawnCenterY, 0)
        .setCcdEnabled(true),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
        .setRestitution(0)
        .setFriction(0.8),
      rigidBody,
    );
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

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    for (const body of this.bodies.values()) {
      body.dispose();
    }
    this.bodies.clear();
    this.dynamicBodies.length = 0;
    this.world.free();
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
