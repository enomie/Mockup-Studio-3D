import { JSDOM } from 'jsdom';
import { Object3D, PerspectiveCamera, Scene } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { GizmoController } from './gizmo-controller';

function createGizmo(): GizmoController {
  const { document } = new JSDOM().window;
  return new GizmoController(new PerspectiveCamera(), document.createElement('div'));
}

describe('GizmoController', () => {
  it('does not attach objects outside the scene graph', () => {
    const gizmo = createGizmo();
    gizmo.attach(new Object3D());
    expect(gizmo.getAttachedObject()).toBeNull();
  });

  it('detaches when the attached object is removed from the scene', () => {
    const gizmo = createGizmo();
    const scene = new Scene();
    const object = new Object3D();
    scene.add(object);
    gizmo.attach(object);
    expect(gizmo.getAttachedObject()).toBe(object);
    expect(gizmo.detachIfOrphaned()).toBe(false);

    scene.remove(object);
    expect(gizmo.detachIfOrphaned()).toBe(true);
    expect(gizmo.getAttachedObject()).toBeNull();
  });
});
