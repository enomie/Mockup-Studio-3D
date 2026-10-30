import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three/webgpu';
import { evalEdge, evalPatchSurfacePoint } from '@/engine/triangle-patch-geometry';
import { defaultTrianglePatchParams, getPatchEdgePoints } from './asset-triangle-patch';
import { insertPatchPoint, removePatchPoint } from './triangle-patch-point-edit';

function edgeSamples(params: ReturnType<typeof defaultTrianglePatchParams>, edge: number): Vector3[] {
  return Array.from({ length: 21 }, (_, i) => evalEdge(params, edge, i / 20));
}

describe('insertPatchPoint', () => {
  it('splits the edge without changing its shape', () => {
    const before = defaultTrianglePatchParams();
    const { params: after } = insertPatchPoint(before, 1, 0.3);
    const a = edgeSamples(before, 1);
    const b = edgeSamples(after, 1);
    a.forEach((point, i) => { expect(point.distanceTo(b[i])).toBeLessThan(1e-9); });
  });

  it('keeps the shape when splitting an already split edge again', () => {
    const once = insertPatchPoint(defaultTrianglePatchParams(), 0, 0.5).params;
    const twice = insertPatchPoint(once, 0, 0.8).params;
    const a = edgeSamples(once, 0);
    const b = edgeSamples(twice, 0);
    a.forEach((point, i) => { expect(point.distanceTo(b[i])).toBeLessThan(1e-9); });
    expect(getPatchEdgePoints(twice, 0).map((point) => point.id)).toEqual(['pt-1', 'pt-4', 'pt-5', 'pt-2']);
  });

  it('places the new point on the edge, in loop order, with the next number', () => {
    const { params, pointId } = insertPatchPoint(defaultTrianglePatchParams(), 2, 0.5);
    expect(pointId).toBe('pt-4');
    expect(params.points.map((point) => point.name)).toEqual(['Point 1', 'Point 2', 'Point 3', 'Point 4']);
    expect(params.edgeParams[pointId]).toBeCloseTo(0.5);
    const point = params.points[3];
    expect(evalEdge(params, 2, 0.5).distanceTo(new Vector3(point.pos.x, point.pos.y, point.pos.z))).toBeLessThan(1e-9);
  });

  it('numbers from ids, so renamed points never cause duplicates', () => {
    const base = defaultTrianglePatchParams();
    base.points[0] = { ...base.points[0], name: 'Point 9' };
    const { pointId, params } = insertPatchPoint(base, 0, 0.5);
    expect(pointId).toBe('pt-4');
    expect(params.points[1].name).toBe('Point 4');
  });

  it('barely moves the surface interior', () => {
    const before = defaultTrianglePatchParams();
    const { params: after } = insertPatchPoint(before, 1, 0.4);
    const a = evalPatchSurfacePoint(before, 1 / 3, 1 / 3, 1 / 3);
    const b = evalPatchSurfacePoint(after, 1 / 3, 1 / 3, 1 / 3);
    expect(a.distanceTo(b)).toBeLessThan(0.02);
  });
});

describe('removePatchPoint', () => {
  it('removes an edge point and its edge param', () => {
    const { params, pointId } = insertPatchPoint(defaultTrianglePatchParams(), 0, 0.5);
    const removed = removePatchPoint(params, pointId);
    expect(removed.points.map((point) => point.id)).toEqual(['pt-1', 'pt-2', 'pt-3']);
    expect(removed.edgeParams).toEqual({});
  });

  it('refuses to remove a corner', () => {
    const params = defaultTrianglePatchParams();
    expect(removePatchPoint(params, 'pt-2')).toBe(params);
  });
});
