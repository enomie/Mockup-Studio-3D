import { afterEach, describe, expect, it } from 'vitest';
import {
  PHYSICS_DYNAMIC_ANGULAR_DAMPING,
  PHYSICS_DYNAMIC_LINEAR_DAMPING,
} from './constants';
import { PhysicsWorld } from './physics-world';

describe('PhysicsWorld dynamic body damping', () => {
  let world: PhysicsWorld | undefined;

  afterEach(() => {
    world?.dispose();
    world = undefined;
  });

  it('applies global linear and angular damping on createDynamicBox', async () => {
    world = await PhysicsWorld.create();
    world.createDynamicBox(
      'damping-test',
      { x: 0.05, y: 0.05, z: 0.05 },
      { x: 0, y: 1, z: 0 },
      { massKg: 1 },
    );

    const body = world.getBody('damping-test');
    expect(body).toBeDefined();
    expect(body!.getLinearDamping()).toBeCloseTo(PHYSICS_DYNAMIC_LINEAR_DAMPING);
    expect(body!.getAngularDamping()).toBeCloseTo(PHYSICS_DYNAMIC_ANGULAR_DAMPING);
  });
});
