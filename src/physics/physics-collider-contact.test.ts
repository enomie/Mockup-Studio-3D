import { afterEach, describe, expect, it } from 'vitest';
import { defaultBlockParams } from '@/scene/asset-block';
import { blockColliderShapeFromParams } from './block-collider-shape';
import {
  GROUND_COLLIDER_FRICTION,
  GROUND_COLLIDER_RESTITUTION,
  RIGID_DYNAMIC_FRICTION,
  RIGID_DYNAMIC_RESTITUTION,
} from './constants';
import { PhysicsWorld } from './physics-world';

describe('PhysicsWorld collider contact parameters', () => {
  let world: PhysicsWorld | undefined;

  afterEach(() => {
    world?.dispose();
    world = undefined;
  });

  it('sets ground collider friction and restitution', async () => {
    world = await PhysicsWorld.create();
    world.createStaticGround('ground-test', 10);

    const body = world.getBody('ground-test');
    expect(body).toBeDefined();
    expect(body!.getColliderFriction()).toBeCloseTo(GROUND_COLLIDER_FRICTION);
    expect(body!.getColliderRestitution()).toBeCloseTo(GROUND_COLLIDER_RESTITUTION);
  });

  it('sets default prop friction and restitution on createDynamicBox', async () => {
    world = await PhysicsWorld.create();
    world.createDynamicBox(
      'box-test',
      { x: 0.05, y: 0.05, z: 0.05 },
      { x: 0, y: 1, z: 0 },
      { massKg: 1 },
    );

    const body = world.getBody('box-test');
    expect(body).toBeDefined();
    expect(body!.getColliderFriction()).toBeCloseTo(RIGID_DYNAMIC_FRICTION);
    expect(body!.getColliderRestitution()).toBeCloseTo(RIGID_DYNAMIC_RESTITUTION);
  });

  it('sets default prop friction and restitution on fixed block collider', async () => {
    world = await PhysicsWorld.create();
    const shape = blockColliderShapeFromParams(defaultBlockParams());
    world.createFixedRigidCollider(
      'block-fixed',
      { kind: 'block', shape },
      {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      },
    );

    const body = world.getBody('block-fixed');
    expect(body).toBeDefined();
    expect(body!.getColliderFriction()).toBeCloseTo(RIGID_DYNAMIC_FRICTION);
    expect(body!.getColliderRestitution()).toBeCloseTo(RIGID_DYNAMIC_RESTITUTION);
  });
});
