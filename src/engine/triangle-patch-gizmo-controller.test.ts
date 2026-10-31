import { describe, expect, it } from 'vitest';
import { Group, Ray, Scene, Vector3 } from 'three/webgpu';
import { closestAxisParamToRay, TrianglePatchGizmoController } from './triangle-patch-gizmo-controller';
import type { EntityRegistry } from './entity-registry';

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

describe('TrianglePatchGizmoController helper lifecycle', () => {
  const v = (x: number, y: number, z: number) => ({ x, y, z });
  const point = (id: string, x: number) => ({
    id,
    name: id,
    pos: v(x, 0, 0),
    handleNext: v(x, 0.1, 0),
    handlePrev: v(x, -0.1, 0),
    handleCrossIn: v(x, 0, 0.1),
    handleCrossOut: v(x, 0, -0.1),
  });

  function setup() {
    const scene = new Scene();
    const object = new Group();
    scene.add(object);
    const entity = {
      id: 'p1',
      assetKind: 'triangle-patch',
      patchParams: {
        divisions: 4,
        points: [point('a', 0), point('b', 1), point('c', 2)],
        cornerIds: ['a', 'b', 'c'],
        edgeParams: {},
      },
    };
    const runtimes = new Map<string, unknown>([['p1', { entity, object }]]);
    const registry = { getRuntime: (id: string) => runtimes.get(id) } as unknown as EntityRegistry;
    const gizmo = new TrianglePatchGizmoController(scene, registry);
    gizmo.setActiveEntity('p1');
    return { gizmo, object, runtimes };
  }

  it('moves helpers with the patch object on frame update', () => {
    const { gizmo, object } = setup();
    object.position.set(5, 0, 0);
    gizmo.updateFrame();
    const anchor = gizmo.getPickables().find((m) => m.userData.pointId === 'a' && m.userData.targetKey === 'pos');
    expect(anchor?.position.x).toBeCloseTo(5);
  });

  it('drops helpers once the active patch is removed', () => {
    const { gizmo, runtimes } = setup();
    expect(gizmo.getPickables().length).toBeGreaterThan(0);
    runtimes.delete('p1');
    gizmo.updateFrame();
    expect(gizmo.getActiveEntityId()).toBeNull();
    expect(gizmo.getPickables()).toEqual([]);
  });
});
