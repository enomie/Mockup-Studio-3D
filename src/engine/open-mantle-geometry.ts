import { BufferAttribute, BufferGeometry } from 'three/webgpu';
import { ensureGeometryTangents } from '@/engine/geometry-tangents';

export interface OpenMantleBuildInput {
  y0: number;
  y1: number;
  sampleRadius: (y: number) => number;
  phiStart: number;
  phiLength: number;
  radialSegments: number;
  heightSegments: number;
  /** Per-vertex UV; defaults to (phiT, heightT). */
  uvAt?: (x: number, y: number, z: number, phiT: number, heightT: number) => [number, number];
}

export function buildOpenMantleGeometry(input: OpenMantleBuildInput): BufferGeometry {
  const {
    y0,
    y1,
    sampleRadius,
    phiStart,
    phiLength,
    radialSegments,
    heightSegments,
    uvAt,
  } = input;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= heightSegments; iy += 1) {
    const heightT = iy / heightSegments;
    const y = y0 + heightT * (y1 - y0);
    const radius = sampleRadius(y);
    for (let ir = 0; ir <= radialSegments; ir += 1) {
      const phiT = ir / radialSegments;
      const phi = phiStart + phiT * phiLength;
      const x = radius * Math.sin(phi);
      const z = radius * Math.cos(phi);
      positions.push(x, y, z);
      normals.push(Math.sin(phi), 0, Math.cos(phi));
      const [u, v] = uvAt
        ? uvAt(x, y, z, phiT, heightT)
        : [phiT, heightT];
      uvs.push(u, v);
    }
  }

  const row = radialSegments + 1;
  for (let iy = 0; iy < heightSegments; iy += 1) {
    for (let ir = 0; ir < radialSegments; ir += 1) {
      const a = iy * row + ir;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  ensureGeometryTangents(geometry);
  return geometry;
}
