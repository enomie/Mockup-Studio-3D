import { describe, expect, it } from 'vitest';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three/webgpu';
import { CAMERA_FOV, CAMERA_ORBIT_DEFAULT_RADIUS } from '@/constants';
import { screenConstantScale } from './screen-constant-scale';

function perspectiveAt(distance: number, fov = CAMERA_FOV): PerspectiveCamera {
  const camera = new PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.set(0, 0, distance);
  return camera;
}

describe('screenConstantScale', () => {
  const origin = new Vector3();

  it('is 1 at the default view', () => {
    expect(screenConstantScale(perspectiveAt(CAMERA_ORBIT_DEFAULT_RADIUS), origin)).toBeCloseTo(1);
  });

  it('doubles when the camera is twice as far away', () => {
    const near = screenConstantScale(perspectiveAt(1), origin);
    expect(screenConstantScale(perspectiveAt(2), origin)).toBeCloseTo(near * 2);
  });

  it('keeps pixel size when the field of view changes', () => {
    const wide = screenConstantScale(perspectiveAt(2, 90), origin);
    const narrow = screenConstantScale(perspectiveAt(2, 45), origin);
    expect(wide / narrow).toBeCloseTo(Math.tan(Math.PI / 4) / Math.tan((45 * Math.PI) / 360));
  });

  it('follows the visible height of an orthographic camera', () => {
    const wide = new OrthographicCamera(-2, 2, 2, -2);
    const tight = new OrthographicCamera(-1, 1, 1, -1);
    expect(screenConstantScale(wide, origin)).toBeCloseTo(screenConstantScale(tight, origin) * 2);
  });

  it('never collapses to zero', () => {
    expect(screenConstantScale(perspectiveAt(0), origin)).toBeGreaterThan(0);
  });
});
