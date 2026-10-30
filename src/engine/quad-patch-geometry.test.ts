import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three/webgpu';
import { defaultQuadPatchParams, type PatchParams } from '@/scene/asset-triangle-patch';
import { insertPatchPoint } from '@/scene/triangle-patch-point-edit';
import { evalEdge } from './triangle-patch-geometry';
import { buildQuadPatchGeometry, evalQuadPatchSurfacePoint } from './quad-patch-geometry';

/** (s, t) on the boundary for edge e at edge parameter u, matching the quad layout. */
function boundaryST(edge: number, u: number): [number, number] {
  return [
    [u, 0],
    [1, u],
    [1 - u, 1],
    [0, 1 - u],
  ][edge] as [number, number];
}

function flatQuad(): PatchParams {
  const params = defaultQuadPatchParams();
  params.points = params.points.map((point) => {
    const lerp = (a: typeof point.pos, b: typeof point.pos, k: number) => ({
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k,
      z: a.z + (b.z - a.z) * k,
    });
    const next = params.points[(params.points.indexOf(point) + 1) % 4].pos;
    const prev = params.points[(params.points.indexOf(point) + 3) % 4].pos;
    return {
      ...point,
      handleNext: lerp(point.pos, next, 1 / 3),
      handlePrev: lerp(point.pos, prev, 1 / 3),
      handleCrossIn: { ...point.pos },
      handleCrossOut: { ...point.pos },
    };
  });
  return params;
}

describe('quad patch geometry', () => {
  it('hits the four corner anchors', () => {
    const params = defaultQuadPatchParams();
    const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    corners.forEach(([s, t], i) => {
      const anchor = params.points[i].pos;
      const pt = evalQuadPatchSurfacePoint(params, s, t);
      expect(pt.distanceTo(new Vector3(anchor.x, anchor.y, anchor.z))).toBeLessThan(1e-9);
    });
  });

  it('keeps the boundary exactly on the edge curves', () => {
    const params = insertPatchPoint(defaultQuadPatchParams(), 2, 0.4).params;
    for (let e = 0; e < 4; e++) {
      for (const u of [0.1, 0.4, 0.75]) {
        const [s, t] = boundaryST(e, u);
        const surface = evalQuadPatchSurfacePoint(params, s, t);
        expect(surface.distanceTo(evalEdge(params, e, u))).toBeLessThan(1e-9);
      }
    }
  });

  it('is flat for coplanar corners, straight edges and no cross offsets', () => {
    const params = flatQuad();
    for (const [s, t] of [[0.2, 0.3], [0.5, 0.5], [0.8, 0.1]]) {
      expect(evalQuadPatchSurfacePoint(params, s, t).y).toBeCloseTo(params.points[0].pos.y, 9);
    }
  });

  it('bulges the interior near an edge point when its cross handle moves', () => {
    const { params, pointId } = insertPatchPoint(defaultQuadPatchParams(), 0, 0.5);
    const before = evalQuadPatchSurfacePoint(params, 0.5, 0.2);
    const moved: PatchParams = {
      ...params,
      points: params.points.map((point) =>
        point.id === pointId
          ? { ...point, handleCrossIn: { ...point.handleCrossIn, y: point.handleCrossIn.y + 0.3 } }
          : point,
      ),
    };
    const after = evalQuadPatchSurfacePoint(moved, 0.5, 0.2);
    expect(after.y).toBeGreaterThan(before.y + 0.01);
    expect(evalQuadPatchSurfacePoint(moved, 0.5, 0).distanceTo(evalQuadPatchSurfacePoint(params, 0.5, 0)))
      .toBeLessThan(1e-9);
  });

  it('builds an upward-facing grid mesh', () => {
    const params = defaultQuadPatchParams();
    const geometry = buildQuadPatchGeometry(params);
    const row = params.divisions + 1;
    expect(geometry.getAttribute('position').count).toBe(row * row);
    expect(geometry.getIndex()!.count).toBe(params.divisions * params.divisions * 6);
    const normals = geometry.getAttribute('normal');
    const center = Math.floor(row / 2) * row + Math.floor(row / 2);
    expect(normals.getY(center)).toBeGreaterThan(0.9);
  });
});
