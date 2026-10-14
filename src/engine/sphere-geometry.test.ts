import { IcosahedronGeometry } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { defaultSphereParams } from '@/scene/asset-sphere';
import {
  buildSphereGeometry,
  SPHERE_RENDER_ICOSAEDRON_DETAIL,
} from './sphere-geometry';

describe('buildSphereGeometry', () => {
  it('uses icosahedron detail 20 for render mesh', () => {
    expect(SPHERE_RENDER_ICOSAEDRON_DETAIL).toBe(20);
    const hi = buildSphereGeometry(defaultSphereParams());
    const lo = new IcosahedronGeometry(defaultSphereParams().radiusM, 0);
    expect(hi.getAttribute('position').count).toBeGreaterThan(
      lo.getAttribute('position').count,
    );
    expect(hi.getAttribute('tangent')).toBeDefined();
    hi.dispose();
    lo.dispose();
  });

  it('spans 2×radius with bottom pivot at y=0', () => {
    const radiusM = 0.2;
    const geometry = buildSphereGeometry({ radiusM });
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.min.y).toBeCloseTo(0, 3);
    expect(box.max.y).toBeCloseTo(radiusM * 2, 3);
    geometry.dispose();
  });
});
