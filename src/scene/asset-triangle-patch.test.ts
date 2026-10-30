import { describe, expect, it } from 'vitest';
import {
  clonePatchPoint,
  defaultTrianglePatchParams,
  getPatchCorners,
  getPatchEdgePoints,
  getPatchMirrorSigns,
  isPatchCorner,
  replacePatchPoint,
  type TrianglePatchParams,
} from './asset-triangle-patch';

/** Default patch with one extra point between corner 2 and corner 3 (edge 1). */
function patchWithEdgePoint(): TrianglePatchParams {
  const params = defaultTrianglePatchParams();
  const extra = { ...clonePatchPoint(params.points[1]), id: 'pt-4', name: 'Point 4' };
  params.points.splice(2, 0, extra);
  params.edgeParams[extra.id] = 0.5;
  return params;
}

describe('triangle patch params', () => {
  it('names the default points Point 1–3 and uses all of them as corners', () => {
    const params = defaultTrianglePatchParams();
    expect(params.points.map((point) => point.name)).toEqual(['Point 1', 'Point 2', 'Point 3']);
    expect(params.cornerIds).toEqual(params.points.map((point) => point.id));
    expect(params.edgeParams).toEqual({});
  });

  it('returns the corners in corner order', () => {
    const params = patchWithEdgePoint();
    expect(getPatchCorners(params).map((point) => point.id)).toEqual(['pt-1', 'pt-2', 'pt-3']);
    expect(isPatchCorner(params, 'pt-4')).toBe(false);
  });

  it('walks each edge from its start corner to its end corner, wrapping around the loop', () => {
    const params = patchWithEdgePoint();
    const ids = (edge: number) => getPatchEdgePoints(params, edge).map((point) => point.id);
    expect(ids(0)).toEqual(['pt-1', 'pt-2']);
    expect(ids(1)).toEqual(['pt-2', 'pt-4', 'pt-3']);
    expect(ids(2)).toEqual(['pt-3', 'pt-1']);
  });

  it('replaces a point by id without touching the others', () => {
    const params = defaultTrianglePatchParams();
    const renamed = { ...clonePatchPoint(params.points[1]), name: 'Nose' };
    const points = replacePatchPoint(params.points, renamed);
    expect(points.map((point) => point.name)).toEqual(['Point 1', 'Nose', 'Point 3']);
    expect(points[0]).toBe(params.points[0]);
  });
});

describe('getPatchMirrorSigns', () => {
  it('returns no copies without mirror', () => {
    expect(getPatchMirrorSigns(undefined)).toEqual([]);
    expect(getPatchMirrorSigns({ x: false, y: false, z: false })).toEqual([]);
  });

  it('includes the diagonal copy for X+Z', () => {
    expect(getPatchMirrorSigns({ x: true, y: false, z: true })).toEqual([
      { x: -1, y: 1, z: 1 },
      { x: 1, y: 1, z: -1 },
      { x: -1, y: 1, z: -1 },
    ]);
  });

  it('yields seven copies for all axes', () => {
    const signs = getPatchMirrorSigns({ x: true, y: true, z: true });
    expect(signs).toHaveLength(7);
    expect(new Set(signs.map((s) => `${s.x},${s.y},${s.z}`)).size).toBe(7);
  });
});
