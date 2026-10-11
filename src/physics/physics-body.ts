import type RAPIER from '@dimforge/rapier3d-simd-compat';
import type { PhysicsTransform } from './types';

export class PhysicsBody {
  readonly id: string;
  private readonly world: RAPIER.World;
  private readonly rigidBody: RAPIER.RigidBody;
  private disposed = false;

  constructor(
    id: string,
    world: RAPIER.World,
    rigidBody: RAPIER.RigidBody,
  ) {
    this.id = id;
    this.world = world;
    this.rigidBody = rigidBody;
  }

  get isDynamic(): boolean {
    return this.rigidBody.isDynamic();
  }

  getTransform(): PhysicsTransform {
    const t = this.rigidBody.translation();
    const r = this.rigidBody.rotation();
    return {
      position: { x: t.x, y: t.y, z: t.z },
      rotation: { x: r.x, y: r.y, z: r.z, w: r.w },
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.world.removeRigidBody(this.rigidBody);
  }
}
