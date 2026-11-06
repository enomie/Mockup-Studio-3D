import { describe, expect, it } from 'vitest';
import { Group, Ray, Scene, Vector3 } from 'three/webgpu';
import { closestAxisParamToRay, TrianglePatchGizmoController } from './triangle-patch-gizmo-controller';
import type { EntityRegistry } from './entity-registry';
import type { PatchParams } from '@/scene/asset-triangle-patch';

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

describe('TrianglePatchGizmoController mirror copies', () => {
  const v = (x: number, y: number, z: number) => ({ x, y, z });
  const point = (id: string, x: number, y: number) => ({
    id,
    name: id,
    pos: v(x, y, 0),
    handleNext: v(x, y + 0.1, 0),
    handlePrev: v(x, y - 0.1, 0),
    handleCrossIn: v(x, y, 0.1),
    handleCrossOut: v(x, y, -0.1),
  });

  function setup(mirror: { x: boolean; y: boolean; z: boolean }) {
    const scene = new Scene();
    const object = new Group();
    scene.add(object);
    const runtime = {
      entity: {
        id: 'p1',
        assetKind: 'triangle-patch',
        patchParams: {
          divisions: 4,
          points: [point('a', 1, 2), point('b', 2, 2), point('c', 3, 2)],
          cornerIds: ['a', 'b', 'c'],
          edgeParams: {},
          mirror,
        } as PatchParams,
      },
      object,
    };
    const registry = {
      getRuntime: (id: string) => (id === 'p1' ? runtime : undefined),
      getPatchNodes: () => [],
      setKindParams: (_kind: string, _id: string, partial: Partial<PatchParams>) => {
        runtime.entity.patchParams = { ...runtime.entity.patchParams, ...partial };
      },
    } as unknown as EntityRegistry;
    const gizmo = new TrianglePatchGizmoController(scene, registry);
    gizmo.setActiveEntity('p1');
    const pick = (pointId: string, targetKey: string, mirrorKey: string | null) =>
      gizmo.getPickables().find(
        (m) => m.userData.pointId === pointId && m.userData.targetKey === targetKey && m.userData.mirrorKey === mirrorKey,
      );
    return { gizmo, runtime, pick };
  }

  it('adds one helper set per mirror copy', () => {
    const none = setup({ x: false, y: false, z: false }).gizmo.getPickables().length;
    expect(setup({ x: true, y: false, z: false }).gizmo.getPickables().length).toBe(none * 2);
    expect(setup({ x: true, y: false, z: true }).gizmo.getPickables().length).toBe(none * 4);
  });

  it('places copy helpers at the mirrored position', () => {
    const { pick } = setup({ x: true, y: false, z: false });
    expect(pick('a', 'pos', '-1,1,1')?.position.toArray()).toEqual([-1, 2, 0]);
    expect(pick('a', 'pos', null)?.position.toArray()).toEqual([1, 2, 0]);
  });

  it('edits the original point when a copy handle is dragged', () => {
    const { gizmo, runtime, pick } = setup({ x: true, y: false, z: false });
    const mesh = pick('b', 'handleNext', '-1,1,1');
    if (!mesh) {throw new Error('missing mirror handle');}
    expect(gizmo.selectHandleByMesh(mesh)?.pointId).toBe('b');
    // Mirror handle of b.handleNext starts at (-2, 2.1, 0); drag it by (+0.5, +0.2, +0.3).
    gizmo.getActiveHandleMesh()?.position.add(new Vector3(0.5, 0.2, 0.3));
    expect(gizmo.applyHandleTransform('translate')).toBe(true);
    const next = runtime.entity.patchParams.points.find((p) => p.id === 'b')?.handleNext;
    expect(next?.x).toBeCloseTo(1.5);
    expect(next?.y).toBeCloseTo(2.3);
    expect(next?.z).toBeCloseTo(0.3);
  });

  it('moves the original anchor with all handles when the copy anchor is dragged', () => {
    const { gizmo, runtime, pick } = setup({ x: true, y: false, z: false });
    const mesh = pick('a', 'pos', '-1,1,1');
    if (!mesh) {throw new Error('missing mirror anchor');}
    gizmo.selectHandleByMesh(mesh);
    gizmo.getActiveHandleMesh()?.position.add(new Vector3(-0.4, 0, 0));
    gizmo.applyHandleTransform('translate');
    const a = runtime.entity.patchParams.points.find((p) => p.id === 'a');
    expect(a?.pos.x).toBeCloseTo(1.4);
    expect(a?.handleNext.x).toBeCloseTo(1.4);
  });

  it('drops copy helpers when mirroring is switched off', () => {
    const { gizmo, runtime } = setup({ x: true, y: false, z: false });
    const withMirror = gizmo.getPickables().length;
    runtime.entity.patchParams = { ...runtime.entity.patchParams, mirror: { x: false, y: false, z: false } };
    gizmo.syncHelpersFromEntity();
    expect(gizmo.getPickables().length).toBe(withMirror / 2);
  });
});
