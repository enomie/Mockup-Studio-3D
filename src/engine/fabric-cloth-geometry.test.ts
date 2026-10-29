import { describe, expect, it } from 'vitest';
import { MeshBasicMaterial, Vector3 } from 'three/webgpu';
import { buildFabricClothMeshFromOptions } from './fabric-cloth-geometry';

describe('fabric-cloth-geometry', () => {
  it('winds front faces along the vertex normals (no back-face lighting)', () => {
    const mesh = buildFabricClothMeshFromOptions({
      faceWidth: 0.4,
      faceHeight: 0.3,
      material: new MeshBasicMaterial(),
      segments: { segmentsW: 3, segmentsH: 2 },
    });
    const geometry = mesh.geometry;
    const pos = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const index = geometry.index!;
    expect(pos.count).toBe(4 * 3);

    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    const n = new Vector3();
    for (let t = 0; t < index.count; t += 3) {
      const ia = index.getX(t);
      a.fromBufferAttribute(pos, ia);
      b.fromBufferAttribute(pos, index.getX(t + 1)).sub(a);
      c.fromBufferAttribute(pos, index.getX(t + 2)).sub(a);
      const face = b.cross(c).normalize();
      n.fromBufferAttribute(normal, ia);
      expect(face.dot(n)).toBeGreaterThan(0.99);
    }
    geometry.dispose();
  });
});
