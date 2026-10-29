import { describe, expect, it } from 'vitest';
import { CONTACT_D_HAT } from './contactConfig.ts';
import { projectSceneCollisions, sceneObstacleClearance } from './sceneColliders.ts';
import { sdfRoundBoxLocal, sdfSphereWorld } from './sdfPrimitives.ts';

describe('sdfPrimitives', () => {
  it('sphere SDF is negative inside', () => {
    expect(sdfSphereWorld(0, 0, 0, 0, 0, 0, 0.1)).toBeLessThan(0);
    expect(sdfSphereWorld(0.2, 0, 0, 0, 0, 0, 0.1)).toBeGreaterThan(0);
  });

  it('round box SDF is negative at center', () => {
    expect(sdfRoundBoxLocal(0, 0, 0, 0.15, 0.03)).toBeLessThan(0);
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
