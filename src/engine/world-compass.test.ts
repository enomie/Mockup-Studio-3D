import { PerspectiveCamera, Spherical, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SCENE_DEFAULTS } from '@/config/scene-defaults';
import { CARDINAL_DIRECTIONS, PLAN_QUADRANTS, cardinal, cardinalYaw } from './world-compass';

function defaultCamera(): PerspectiveCamera {
  const view = SCENE_DEFAULTS.camera.normalView;
  const camera = new PerspectiveCamera(view.fov, 16 / 9, 0.01, 100);
  const target = new Vector3(view.target.x, view.target.y, view.target.z);
  const { radius, phi, theta } = view.spherical;
  camera.position.copy(target).add(new Vector3().setFromSpherical(new Spherical(radius, phi, theta)));
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function toScreen(camera: PerspectiveCamera, x: number, z: number): Vector3 {
  return new Vector3(x, 0, z).project(camera);
}

describe('world compass', () => {
  it('is right-handed: East = North rotated clockwise seen from above', () => {
    const n = cardinal('north');
    const e = cardinal('east');
    // Clockwise seen from +Y: cross(N, E) points down (-Y) in a right-handed frame.
    const crossY = n.z * e.x - n.x * e.z;
    expect(crossY).toBeLessThan(0);
    expect([n.x, n.z]).toEqual([0, -1]);
    expect([e.x, e.z]).toEqual([1, 0]);
  });

  it('orders directions N, E, S, W and points opposite pairs apart', () => {
    expect(CARDINAL_DIRECTIONS.map((d) => d.short)).toEqual(['N', 'E', 'S', 'W']);
    const [n, e, s, w] = CARDINAL_DIRECTIONS;
    expect(n.x + s.x).toBe(0);
    expect(n.z + s.z).toBe(0);
    expect(e.x + w.x).toBe(0);
    expect(e.z + w.z).toBe(0);
  });

  it('uses four distinct arrow colors', () => {
    expect(new Set(CARDINAL_DIRECTIONS.map((d) => d.color)).size).toBe(4);
  });

  it('uses distinct quadrant colors that differ from the arrow colors', () => {
    const quadrantColors = PLAN_QUADRANTS.map((q) => q.color);
    expect(new Set(quadrantColors).size).toBe(4);
    for (const d of CARDINAL_DIRECTIONS) {
      expect(quadrantColors).not.toContain(d.color);
    }
  });

  it('quadrant short names match their cardinal signs', () => {
    for (const q of PLAN_QUADRANTS) {
      const ns = q.signZ === Math.sign(cardinal('north').z) ? 'N' : 'S';
      const ew = q.signX === Math.sign(cardinal('east').x) ? 'E' : 'W';
      expect(q.short).toBe(ns + ew);
    }
  });

  it('yaw turns a +Z arrow onto each direction', () => {
    for (const d of CARDINAL_DIRECTIONS) {
      const tip = new Vector3(0, 0, 1).applyAxisAngle(new Vector3(0, 1, 0), cardinalYaw(d));
      expect(tip.x).toBeCloseTo(d.x);
      expect(tip.z).toBeCloseTo(d.z);
    }
  });

  it('alpha is north-east and quadrants run clockwise', () => {
    const n = cardinal('north');
    const e = cardinal('east');
    const alpha = PLAN_QUADRANTS[0];
    expect(alpha.id).toBe('alpha');
    expect(alpha.signX).toBe(Math.sign(e.x));
    expect(alpha.signZ).toBe(Math.sign(n.z));
    expect(PLAN_QUADRANTS.map((q) => q.label)).toEqual([
      'North-east', 'South-east', 'South-west', 'North-west',
    ]);
  });

  it('default camera: North is up, East is right, alpha is top-right on screen', () => {
    const camera = defaultCamera();
    const north = toScreen(camera, 0, -1);
    const south = toScreen(camera, 0, 1);
    const east = toScreen(camera, 1, 0);
    const west = toScreen(camera, -1, 0);
    expect(north.y).toBeGreaterThan(south.y);
    expect(east.x).toBeGreaterThan(west.x);

    const alpha = PLAN_QUADRANTS[0];
    const a = toScreen(camera, alpha.signX * 0.5, alpha.signZ * 0.5);
    expect(a.x).toBeGreaterThan(toScreen(camera, -0.5, -0.5).x);
    expect(a.y).toBeGreaterThan(toScreen(camera, 0.5, 0.5).y);
  });
});
