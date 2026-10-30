import { describe, expect, it } from 'vitest';
import { MeshBasicMaterial } from 'three/webgpu';
import { buildFabricClothMeshFromOptions } from '@/engine/fabric-cloth-geometry';
import { bakeFabricClothMeshFromDeformed } from '@/engine/fabric-cloth-bake';
import {
  fabricClothBakedMeshTopology,
  formatFabricClothBakedMeshSubtitle,
} from './user-baked-asset';

describe('fabricClothBakedMeshTopology', () => {
  it('counts vertices and triangles from segment grid', () => {
    const topology = fabricClothBakedMeshTopology({ segmentsW: 8, segmentsH: 8 });
    expect(topology.vertexCount).toBe(81);
    expect(topology.triangleCount).toBe(128);
  });

  it('bakes at simulation resolution', () => {
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.04,
      faceHeight: 0.04,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 4, segmentsH: 4 },
    });
    const payload = bakeFabricClothMeshFromDeformed(mesh);
    expect(payload.segmentsW).toBe(4);
    expect(payload.segmentsH).toBe(4);
    const topology = fabricClothBakedMeshTopology(payload);
    expect(topology.triangleCount).toBe(32);
    expect(formatFabricClothBakedMeshSubtitle(payload)).toBe('4×4 · 32 tris');
    mesh.geometry.dispose();
  });
});
