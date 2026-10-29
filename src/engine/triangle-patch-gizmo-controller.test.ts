import { describe, expect, it } from 'vitest';
import { Ray, Vector3 } from 'three/webgpu';
import { closestAxisParamToRay } from './triangle-patch-gizmo-controller';

describe('closestAxisParamToRay', () => {
  it('returns the axis param under a ray crossing the axis', () => {
    const origin = new Vector3(0, 0, 0);
    const dir = new Vector3(1, 0, 0);
    const ray = new Ray(new Vector3(0.3, 5, 0), new Vector3(0, -1, 0));
    expect(closestAxisParamToRay(origin, dir, ray)).toBeCloseTo(0.3);
  });

  it('projects skew rays onto the axis', () => {
    const origin = new Vector3(1, 0, 0);
    const dir = new Vector3(0, 0, 1);
    const ray = new Ray(new Vector3(0, 2, -0.5), new Vector3(0, -1, 0));
    expect(closestAxisParamToRay(origin, dir, ray)).toBeCloseTo(-0.5);
  });

  it('returns null for rays parallel to the axis', () => {
    const ray = new Ray(new Vector3(0, 1, 0), new Vector3(1, 0, 0));
    expect(closestAxisParamToRay(new Vector3(), new Vector3(1, 0, 0), ray)).toBeNull();
  });
});
