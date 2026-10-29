import { Box3, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import {
  SHADOW_COVERAGE_RADIUS,
  SHADOW_COVERAGE_RADIUS_MIN,
} from '@/constants';
import { computeSceneShadowCoverageRadius } from './scene-shadow-coverage';

describe('computeSceneShadowCoverageRadius', () => {
  it('returns max coverage when there are no entities', () => {
    const radius = computeSceneShadowCoverageRadius([], { x: 0, y: 0, z: 0 });
    expect(radius).toBe(SHADOW_COVERAGE_RADIUS);
  });

  it('tightens radius for a compact layout', () => {
    const root = new Group();
    const mesh = new Mesh(
      new PlaneGeometry(0.4, 0.4),
      new MeshBasicMaterial(),
    );
    mesh.position.set(0.1, 0, -0.05);
    root.add(mesh);
    root.updateMatrixWorld(true);

    const radius = computeSceneShadowCoverageRadius([root], { x: 0, y: 0, z: 0 });
    expect(radius).toBeGreaterThanOrEqual(SHADOW_COVERAGE_RADIUS_MIN);
    expect(radius).toBeLessThan(SHADOW_COVERAGE_RADIUS);
  });

  it('caps at max coverage for a wide layout', () => {
    const root = new Group();
    const mesh = new Mesh(
      new PlaneGeometry(6, 6),
      new MeshBasicMaterial(),
    );
    root.add(mesh);
    root.updateMatrixWorld(true);

    const box = new Box3().setFromObject(root);
    const center = {
      x: (box.min.x + box.max.x) / 2,
      y: 0,
      z: (box.min.z + box.max.z) / 2,
    };
    const radius = computeSceneShadowCoverageRadius([root], center);
    expect(radius).toBe(SHADOW_COVERAGE_RADIUS);
  });
});
