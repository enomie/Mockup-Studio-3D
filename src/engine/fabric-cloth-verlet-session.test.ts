import { describe, expect, it } from 'vitest';
import { BufferAttribute, BufferGeometry, Mesh } from 'three/webgpu';
import {
  restoreFabricClothVerletMesh,
  setCornerWorldPosition,
  wakeFabricClothVerletBinding,
  type FabricClothVerletBinding,
} from './fabric-cloth-verlet-session';

function makeBinding(): FabricClothVerletBinding {
  const pos = new Float32Array(12);
  const oldPos = new Float32Array(12);
  return {
    clothMesh: {} as never,
    grid: {
      segmentsW: 1,
      segmentsH: 1,
      segX: 1,
      segY: 1,
      nx: 2,
      ny: 2,
      planeVertexCount: 4,
    },
    numVertices: 4,
    pos,
    oldPos,
    contactFlags: new Uint8Array(4),
    contactNormals: new Float32Array(12),
    pinnedFlags: new Uint8Array(4),
    constraints: [],
    cornerIndexMap: [0, 1, 2, 3],
    originalLocal: new Float32Array(12),
    restPositions: new Float32Array(24),
    restNormals: new Float32Array(24),
    localCenterlineScratch: new Float32Array(12),
    syncFrameIndex: 0,
    consecutiveRestFrames: 12,
    wakeSignature: 0,
  };
}

describe('fabricClothVerletSession pins', () => {
  it('wakeFabricClothVerletBinding resets consecutiveRestFrames', () => {
    const binding = makeBinding();
    wakeFabricClothVerletBinding(binding);
    expect(binding.consecutiveRestFrames).toBe(0);
  });

  it('setCornerWorldPosition updates pos and oldPos', () => {
    const binding = makeBinding();
    setCornerWorldPosition(binding, 0, 0.5, 1.2, -0.3, false);
    expect(binding.pos[0]).toBeCloseTo(0.5);
    expect(binding.pos[1]).toBeCloseTo(1.2);
    expect(binding.oldPos[2]).toBeCloseTo(-0.3);
  });

  it('restoreFabricClothVerletMesh restores positions and normals from rest snapshot', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]);
    const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(8), 2));

    const binding: FabricClothVerletBinding = {
      ...makeBinding(),
      clothMesh: new Mesh(geometry),
      restPositions: new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0, 2, 2, 0]),
      restNormals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
    };

    positions[0] = 9;
    normals[0] = 9;

    restoreFabricClothVerletMesh(binding);

    expect(positions[0]).toBe(0);
    expect(positions[3]).toBe(2);
    expect(normals[0]).toBe(0);
    expect(normals[1]).toBe(1);
    expect(normals[3]).toBe(0);
  });
});
