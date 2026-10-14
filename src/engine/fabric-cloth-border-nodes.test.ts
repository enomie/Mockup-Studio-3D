import { describe, expect, it } from 'vitest';
import { FABRIC_CLOTH_BORDER_WIDTH_M } from '@/scene/asset-fabric-cloth';
import { fabricClothBorderMaskFromRestPlane } from './fabric-cloth-border-nodes';
import { buildFabricClothMeshFromOptions } from './fabric-cloth-geometry';

describe('fabricClothBorderMaskFromRestPlane', () => {
  const w = 0.45;
  const h = 0.45;
  const border = FABRIC_CLOTH_BORDER_WIDTH_M;

  it('marks edge vertices as border in rest plane space', () => {
    const halfW = w * 0.5;
    expect(fabricClothBorderMaskFromRestPlane(halfW - 0.001, 0, w, h, border)).toBe(1);
    expect(fabricClothBorderMaskFromRestPlane(0, 0, w, h, border)).toBe(0);
  });

  it('restPlaneXY stays fixed when position is deformed', () => {
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: w,
      faceHeight: h,
      material: {} as never,
    });
    const pos = mesh.geometry.getAttribute('position');
    const rest = mesh.geometry.getAttribute('restPlaneXY');
    expect(rest).toBeDefined();

    const restBefore = new Float32Array(rest.array as Float32Array);
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i) * 0.5, pos.getY(i) + 0.1, 0.05);
    }

    const restAfter = rest.array as Float32Array;
    expect(restAfter).toEqual(restBefore);

    const halfW = w * 0.5;
    let edgeIdx = -1;
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(restBefore[i * 2] - halfW) < 0.002) {
        edgeIdx = i;
        break;
      }
    }
    expect(edgeIdx).toBeGreaterThanOrEqual(0);
    const rx = restBefore[edgeIdx * 2];
    const ry = restBefore[edgeIdx * 2 + 1];
    expect(fabricClothBorderMaskFromRestPlane(rx, ry, w, h, border)).toBe(1);
    pos.setXYZ(edgeIdx, 0, 0, 0);
    expect(fabricClothBorderMaskFromRestPlane(pos.getX(edgeIdx), pos.getY(edgeIdx), w, h, border)).toBe(
      0,
    );
    expect(fabricClothBorderMaskFromRestPlane(rx, ry, w, h, border)).toBe(1);
  });
});
