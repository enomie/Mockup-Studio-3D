import { describe, expect, it } from 'vitest';
import { patchLocalToWorld, patchWorldToLocal } from './patch-nodes';

describe('patch inspector space helpers', () => {
  const transform = { position: { x: 2, y: 0.5, z: 1 }, rotation: { x: 0.2, y: 0.7, z: -0.1 } };

  it('round-trips between patch-local and scene coordinates', () => {
    const local = { x: 0.3, y: -0.2, z: 0.4 };
    const back = patchWorldToLocal(patchLocalToWorld(local, transform), transform);
    expect(back.x).toBeCloseTo(local.x);
    expect(back.y).toBeCloseTo(local.y);
    expect(back.z).toBeCloseTo(local.z);
  });

  it('setting scene X to 0 lands the point on the scene axis and keeps Y/Z', () => {
    const world = patchLocalToWorld({ x: 0.3, y: -0.2, z: 0.4 }, transform);
    const local = patchWorldToLocal({ ...world, x: 0 }, transform);
    const result = patchLocalToWorld(local, transform);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(world.y);
    expect(result.z).toBeCloseTo(world.z);
  });
});
