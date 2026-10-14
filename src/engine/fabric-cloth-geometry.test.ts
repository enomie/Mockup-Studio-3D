import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three/webgpu';
import { buildFabricClothMesh, buildFabricClothMeshFromOptions } from './fabric-cloth-geometry';

function positionBounds(geometry: BufferGeometry) {
  const pos = geometry.attributes.position.array;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i];
    const y = pos[i + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { minX, maxX, minY, maxY };
}

function uvAtCorners(geometry: BufferGeometry) {
  const pos = geometry.attributes.position.array;
  const uv = geometry.attributes.uv.array;
  const corners: { u: number; v: number }[] = [];
  const targets = [
    { x: -0.225, y: -0.15 },
    { x: 0.225, y: -0.15 },
    { x: -0.225, y: 0.15 },
    { x: 0.225, y: 0.15 },
  ];
  const tol = 1e-4;
  for (const t of targets) {
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i];
      const y = pos[i + 1];
      if (Math.abs(x - t.x) <= tol && Math.abs(y - t.y) <= tol) {
        const ui = (i / 3) * 2;
        corners.push({ u: uv[ui], v: uv[ui + 1] });
        break;
      }
    }
  }
  return corners;
}

describe('fabric-cloth-geometry', () => {
  it('builds a horizontal subdivided cloth mesh by default', () => {
    const mesh = buildFabricClothMesh(0.45, 0.3, {} as never);
    expect(mesh.userData.assetMeshRole).toBe('fabricCloth');
    expect(mesh.userData.isAssetScreen).toBe(true);
    expect(mesh.rotation.x).toBeCloseTo(-Math.PI / 2);
    const vertexCount = mesh.geometry.attributes.position.count;
    expect(vertexCount).toBeGreaterThan(4);
  });

  it('honors segment override', () => {
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.45,
      faceHeight: 0.3,
      material: {} as never,
      segments: { segmentsW: 2, segmentsH: 3 },
    });
    expect(mesh.geometry.attributes.position.count).toBe(12);
  });

  it('matches plane footprint in local space', () => {
    const w = 0.45;
    const h = 0.3;
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: w,
      faceHeight: h,
      material: {} as never,
      segments: { segmentsW: 4, segmentsH: 4 },
    });
    const { minX, maxX, minY, maxY } = positionBounds(mesh.geometry);
    expect(minX).toBeCloseTo(-w / 2);
    expect(maxX).toBeCloseTo(w / 2);
    expect(minY).toBeCloseTo(-h / 2);
    expect(maxY).toBeCloseTo(h / 2);
  });

  it('has parametric UV corners at 0 and 1', () => {
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.45,
      faceHeight: 0.3,
      material: {} as never,
      segments: { segmentsW: 2, segmentsH: 2 },
    });
    const corners = uvAtCorners(mesh.geometry);
    expect(corners.length).toBe(4);
    const us = corners.map((c) => c.u);
    const vs = corners.map((c) => c.v);
    expect(Math.min(...us)).toBeCloseTo(0, 3);
    expect(Math.max(...us)).toBeCloseTo(1, 3);
    expect(Math.min(...vs)).toBeCloseTo(0, 3);
    expect(Math.max(...vs)).toBeCloseTo(1, 3);
  });
});
