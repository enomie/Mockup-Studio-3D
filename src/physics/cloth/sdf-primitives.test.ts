import { describe, expect, it } from 'vitest';
import { CONTACT_D_HAT } from '@/physics/cloth/contact-config';
import { projectSceneCollisions, sceneObstacleClearance } from '@/physics/cloth/scene-colliders';
import {
  sdfCappedCylinderLocal,
  sdfRoundBoxLocal,
  sdfSphereWorld,
} from '@/physics/cloth/sdf-primitives';

describe('sdfPrimitives', () => {
  it('sphere SDF is negative inside', () => {
    expect(sdfSphereWorld(0, 0, 0, 0, 0, 0, 0.1)).toBeLessThan(0);
    expect(sdfSphereWorld(0.2, 0, 0, 0, 0, 0, 0.1)).toBeGreaterThan(0);
  });

  it('round box SDF is negative at center (cube)', () => {
    expect(sdfRoundBoxLocal(0, 0, 0, { x: 0.15, y: 0.15, z: 0.15 }, 0.03)).toBeLessThan(0);
  });

  it('round box SDF is negative at center (non-uniform)', () => {
    expect(sdfRoundBoxLocal(0, 0, 0, { x: 0.2, y: 0.05, z: 0.1 }, 0.01)).toBeLessThan(0);
  });

  it('round box SDF is positive outside along long axis', () => {
    expect(sdfRoundBoxLocal(0.5, 0, 0, { x: 0.2, y: 0.05, z: 0.1 }, 0.01)).toBeGreaterThan(0);
  });

  it('capped cylinder SDF is negative at center', () => {
    expect(sdfCappedCylinderLocal(0, 0, 0, 0.1, 0.15)).toBeLessThan(0);
  });

  it('capped cylinder SDF is positive outside radially', () => {
    expect(sdfCappedCylinderLocal(0.2, 0, 0, 0.1, 0.15)).toBeGreaterThan(0);
  });

  it('capped cylinder SDF is positive above cap', () => {
    expect(sdfCappedCylinderLocal(0, 0.2, 0, 0.1, 0.15)).toBeGreaterThan(0);
  });
});

describe('projectSceneCollisions', () => {
  it('pushes a point inside a sphere outward by d_hat', () => {
    const snapshot = {
      colliders: [
        {
          kind: 'sphere' as const,
          radius: 0.1,
          centerX: 0,
          centerY: 0.2,
          centerZ: 0,
        },
      ],
    };
    const projected = projectSceneCollisions(0, 0.12, 0, snapshot, CONTACT_D_HAT, CONTACT_D_HAT);
    const clearance = sceneObstacleClearance(
      projected.x,
      projected.y,
      projected.z,
      snapshot,
      CONTACT_D_HAT,
    );
    expect(clearance).toBeGreaterThanOrEqual(-1e-5);
    expect(projected.y).toBeCloseTo(0.2 - (0.1 + CONTACT_D_HAT), 5);
  });
});
